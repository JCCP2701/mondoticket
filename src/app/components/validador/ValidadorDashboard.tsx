import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Ticket, LogOut, Camera, CameraOff, Keyboard, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Search, WifiOff, Wifi, DownloadCloud, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dataService, EventRecord, CheckInResult, GateScanRecord, CheckInOutcome } from "../../services/dataService";
import { supabase } from "../../services/supabaseClient";
import OrgSwitcher from "../shared/OrgSwitcher";
import { verifyScannedCode } from "../../lib/offlineVerify";
import { saveManifest, getManifestEntry, findManifestEntryByHash, markLocalUsed, queueScan, getPendingScans, markScansSynced, type PendingScan } from "../../lib/offlineGate";

const DEVICE_ID_KEY = "tb_validador_device_id";

function getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

// Short, synthesized beep — no external audio asset needed, and nothing to
// fetch when the venue's network is spotty.
function playBeep(ok: boolean) {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = ok ? 880 : 220;
        gain.gain.value = 0.15;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, ok ? 120 : 280);
    } catch {
        // Audio isn't critical to the flow — ignore if the browser blocks it.
    }
}

const RESULT_LABEL: Record<string, string> = {
    ok: "Acceso permitido",
    already_used: "Ya fue escaneado",
    cancelled: "Boleto reembolsado",
    wrong_event: "Boleto de otro evento",
    not_found: "Código no reconocido",
    invalid_signature: "Código expirado o alterado",
};

// A network-layer failure (no connectivity) throws before PostgREST ever
// gets to produce a structured error — those never carry a `.code`. A real
// server-side rejection (FORBIDDEN, etc.) always does. This is what lets
// handleDetected fall back to local verification only when it's actually
// offline, not silently swallow a real authorization error.
function isNetworkError(err: any): boolean {
    return !err?.code;
}

export default function ValidadorDashboard() {
    const { user, logout, activeOrganizationId } = useAuth();
    const [events, setEvents] = useState<EventRecord[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [lastResult, setLastResult] = useState<(CheckInResult & { offline?: boolean }) | null>(null);
    const [checking, setChecking] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [recentScans, setRecentScans] = useState<GateScanRecord[]>([]);
    const [checkedInCount, setCheckedInCount] = useState(0);
    const [undoing, setUndoing] = useState(false);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlineReady, setOfflineReady] = useState(false);
    const [preparingOffline, setPreparingOffline] = useState(false);
    const [offlineError, setOfflineError] = useState("");
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState("");
    const eventKeyRef = useRef<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const lastScanRef = useRef<{ code: string; at: number } | null>(null);
    const deviceId = useRef(getDeviceId());

    useEffect(() => {
        // A superadmin account (allowed on this route to oversee gate
        // scanning) belongs to zero organizations, so activeOrganizationId
        // never becomes truthy for it — bail out of the loading state
        // instead of spinning forever with no way to escape.
        if (!activeOrganizationId) { setLoading(false); return; }
        setLoading(true);
        setLoadError("");
        dataService.getEventsByOrganization(activeOrganizationId).then((evs) => {
            setEvents(evs);
            setSelectedEventId((prev) => prev || evs[0]?.id || "");
            setLoading(false);
        }).catch(() => {
            setLoadError("No se pudieron cargar los eventos. Verifica tu conexión e intenta de nuevo.");
            setLoading(false);
        });
    }, [activeOrganizationId]);

    const loadScans = useCallback(async (eventId: string) => {
        try {
            const scans = await dataService.getScansForEvent(eventId);
            setRecentScans(scans);
            setCheckedInCount(scans.filter((s) => s.result === "ok").length);
        } catch {
            // Offline — the last-known counters just stay as they are.
        }
    }, []);

    const refreshPendingCount = useCallback(async () => {
        if (!selectedEventId) return;
        const pending = await getPendingScans(selectedEventId);
        setPendingCount(pending.length);
    }, [selectedEventId]);

    useEffect(() => {
        if (!selectedEventId) return;
        loadScans(selectedEventId);
        refreshPendingCount();
        setOfflineReady(false);
        eventKeyRef.current = null;

        const channel = supabase
            .channel(`ticket-scans-${selectedEventId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_scans", filter: `event_id=eq.${selectedEventId}` }, () => {
                loadScans(selectedEventId);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [selectedEventId, loadScans, refreshPendingCount]);

    // navigator.onLine is unreliable (a device can report "online" while
    // actually having no real connectivity) — it's only the first signal.
    // The real fallback trigger is a network error on the live RPC call
    // itself, handled inside handleDetected.
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    const handleSync = useCallback(async () => {
        if (!selectedEventId) return;
        const pending = await getPendingScans(selectedEventId);
        if (pending.length === 0) return;
        setSyncing(true);
        setSyncMessage("");
        try {
            const results = await dataService.syncTicketScans(
                selectedEventId,
                pending.map((p) => ({ clientScanId: p.clientScanId, qrCode: p.qrCode, deviceId: p.deviceId, scannedAt: p.scannedAt }))
            );
            await markScansSynced(results.map((r) => r.clientScanId));
            const conflicts = results.filter((r) => r.conflict).length;
            setSyncMessage(conflicts > 0
                ? `Sincronizado: ${results.length} escaneos, ${conflicts} con conflicto (revisar reconciliación).`
                : `Sincronizado: ${results.length} escaneos, sin conflictos.`);
            await refreshPendingCount();
            await loadScans(selectedEventId);
        } catch (err: any) {
            setSyncMessage(`No se pudo sincronizar: ${err.message || "reintenta más tarde"}`);
        } finally {
            setSyncing(false);
        }
    }, [selectedEventId, refreshPendingCount, loadScans]);

    // Auto-sync a few seconds after reconnecting, so staff don't have to
    // remember to press the button every time signal comes back.
    useEffect(() => {
        if (!isOnline || !selectedEventId) return;
        const t = setTimeout(() => { handleSync(); }, 2000);
        return () => clearTimeout(t);
    }, [isOnline, selectedEventId, handleSync]);

    const handlePrepareOffline = async () => {
        if (!selectedEventId) return;
        setPreparingOffline(true);
        setOfflineError("");
        try {
            const [manifest, key] = await Promise.all([
                dataService.getEventGateManifest(selectedEventId),
                dataService.getEventSigningKey(selectedEventId),
            ]);
            await saveManifest(selectedEventId, manifest);
            eventKeyRef.current = key;
            setOfflineReady(true);
        } catch (err: any) {
            setOfflineError(err.message || "No se pudo preparar el modo offline");
        } finally {
            setPreparingOffline(false);
        }
    };

    const handleOfflineScan = useCallback(async (code: string): Promise<CheckInResult & { offline: true }> => {
        const base = { checkedInAt: null as string | null, checkedInByName: null as string | null };
        if (!offlineReady || !eventKeyRef.current) {
            return { result: "not_found", ticketId: null, ticketTypeName: null, seatLabel: null, holderName: null, ...base, offline: true };
        }

        const verified = await verifyScannedCode(code, eventKeyRef.current);
        let ticketId: string | null = null;
        if (verified.kind === "rotating") {
            ticketId = verified.valid ? verified.ticketId : null;
            if (!verified.valid) {
                return { result: "invalid_signature", ticketId: null, ticketTypeName: null, seatLabel: null, holderName: null, ...base, offline: true };
            }
        } else {
            const entry = await findManifestEntryByHash(selectedEventId, verified.qrHash);
            ticketId = entry?.ticketId ?? null;
        }

        if (!ticketId) {
            return { result: "not_found", ticketId: null, ticketTypeName: null, seatLabel: null, holderName: null, ...base, offline: true };
        }

        const entry = await getManifestEntry(ticketId);
        if (!entry) {
            return { result: "not_found", ticketId: null, ticketTypeName: null, seatLabel: null, holderName: null, ...base, offline: true };
        }

        const outcome: CheckInOutcome = entry.status === "cancelled" ? "cancelled" : entry.status === "used" ? "already_used" : "ok";
        const nowIso = new Date().toISOString();

        if (outcome === "ok") await markLocalUsed(ticketId);

        const scan: PendingScan = {
            clientScanId: crypto.randomUUID(),
            eventId: selectedEventId,
            qrCode: code,
            ticketId,
            deviceId: deviceId.current,
            scannedAt: nowIso,
            localResult: outcome as PendingScan['localResult'],
            synced: false,
        };
        await queueScan(scan);
        await refreshPendingCount();

        return {
            result: outcome,
            ticketId,
            ticketTypeName: entry.ticketTypeName,
            seatLabel: entry.seatLabel,
            holderName: entry.holderName,
            checkedInAt: outcome === "ok" ? nowIso : null,
            checkedInByName: outcome === "ok" ? (user?.name ?? null) : null,
            offline: true,
        };
    }, [offlineReady, selectedEventId, refreshPendingCount, user?.name]);

    const handleDetected = useCallback(async (code: string) => {
        const now = Date.now();
        // Ignore the same code re-detected within 3s (still in frame) so one
        // physical scan doesn't fire the RPC dozens of times per second.
        if (lastScanRef.current && lastScanRef.current.code === code && now - lastScanRef.current.at < 3000) return;
        lastScanRef.current = { code, at: now };

        if (!selectedEventId || checking) return;
        setChecking(true);
        try {
            if (navigator.onLine) {
                try {
                    const result = await dataService.checkInTicket(code, selectedEventId, deviceId.current);
                    setLastResult(result);
                    playBeep(result.result === "ok");
                    if (navigator.vibrate) navigator.vibrate(result.result === "ok" ? 80 : [80, 60, 80]);
                    loadScans(selectedEventId);
                    return;
                } catch (err: any) {
                    if (!isNetworkError(err)) {
                        setLastResult({ result: "not_found", ticketId: null, ticketTypeName: null, seatLabel: null, holderName: null, checkedInAt: null, checkedInByName: null });
                        playBeep(false);
                        return;
                    }
                    // Network error despite navigator.onLine === true — fall
                    // through to local verification below.
                }
            }

            const offlineResult = await handleOfflineScan(code);
            setLastResult(offlineResult);
            playBeep(offlineResult.result === "ok");
            if (navigator.vibrate) navigator.vibrate(offlineResult.result === "ok" ? 80 : [80, 60, 80]);
        } finally {
            setChecking(false);
        }
    }, [selectedEventId, checking, loadScans, handleOfflineScan]);

    // Camera loop
    useEffect(() => {
        if (!scanning) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        let cancelled = false;
        setCameraError("");

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const tick = () => {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height);
                            if (code?.data) handleDetected(code.data);
                        }
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);
            } catch (err: any) {
                setCameraError(err.message || "No se pudo acceder a la cámara");
                setScanning(false);
            }
        })();

        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning, selectedEventId]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleDetected(manualCode.trim());
        setManualCode("");
    };

    const handleUndo = async () => {
        if (!lastResult?.ticketId) return;
        setUndoing(true);
        try {
            await dataService.undoCheckIn(lastResult.ticketId);
            setLastResult(null);
            if (selectedEventId) loadScans(selectedEventId);
        } catch (err: any) {
            alert(err.message || "No se pudo revertir el escaneo");
        } finally {
            setUndoing(false);
        }
    };

    const resultColor = lastResult
        ? lastResult.result === "ok" ? "#328022" : "#e11d48"
        : "#6b7280";

    if (loading) return <div className="dark min-h-screen bg-background p-8 text-muted-foreground">Cargando...</div>;

    if (!activeOrganizationId) {
        return (
            <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center p-8">
                <div className="max-w-sm text-center space-y-3">
                    <Ticket className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="font-bold">Esta cuenta no pertenece a ninguna organización</p>
                    <p className="text-sm text-muted-foreground">No hay ningún evento que validar desde aquí. Inicia sesión con una cuenta de Validador, Taquilla u Organización para escanear boletos.</p>
                    <button onClick={() => logout()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-bold">
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-background text-foreground">
            <header className="bg-card border-b border-border sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold">Validador de Boletos</h1>
                            <p className="text-xs text-muted-foreground">{user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <OrgSwitcher variant="dark" />
                        <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-bold">
                            <LogOut className="w-4 h-4" /> Salir
                        </button>
                    </div>
                </div>
            </header>

            {!isOnline && (
                <div className="bg-amber-500 text-white text-sm font-bold text-center py-2 flex items-center justify-center gap-2">
                    <WifiOff className="w-4 h-4" /> MODO OFFLINE — {pendingCount} escaneo{pendingCount !== 1 ? 's' : ''} sin sincronizar
                </div>
            )}

            <main className="px-6 py-6 space-y-6">
                {loadError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{loadError}</div>
                )}
                <div className="bg-card p-6 rounded-2xl border border-border">
                    <label className="text-sm font-bold text-muted-foreground mb-2 block">Evento</label>
                    <select
                        value={selectedEventId}
                        onChange={(e) => { setSelectedEventId(e.target.value); setLastResult(null); }}
                        className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                    >
                        {events.length === 0 && <option value="">Sin eventos disponibles</option>}
                        {events.map((e) => (
                            <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleDateString('es-MX')}</option>
                        ))}
                    </select>
                    {selectedEventId && (
                        <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-muted-foreground">
                                <strong className="text-foreground">{checkedInCount}</strong> ingresados hasta ahora
                            </p>
                            <div className="flex items-center gap-2">
                                {isOnline ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
                                {offlineReady && <span className="text-xs font-bold text-success">Modo offline listo</span>}
                            </div>
                        </div>
                    )}

                    {selectedEventId && (
                        <div className="mt-4 flex gap-2 flex-wrap">
                            <button
                                onClick={handlePrepareOffline}
                                disabled={preparingOffline || !isOnline}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-secondary text-sm font-bold disabled:opacity-50"
                            >
                                <DownloadCloud className="w-4 h-4" />
                                {preparingOffline ? "Preparando..." : offlineReady ? "Actualizar modo offline" : "Preparar modo offline"}
                            </button>
                            {pendingCount > 0 && (
                                <button
                                    onClick={handleSync}
                                    disabled={syncing || !isOnline}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {syncing ? "Sincronizando..." : `Sincronizar (${pendingCount})`}
                                </button>
                            )}
                        </div>
                    )}
                    {offlineError && <p className="text-xs text-red-600 mt-2">{offlineError}</p>}
                    {syncMessage && <p className="text-xs text-muted-foreground mt-2">{syncMessage}</p>}
                </div>

                {selectedEventId && (
                    <>
                        <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold">Escanear boleto</h3>
                                <button
                                    onClick={() => setScanning((s) => !s)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${scanning ? 'bg-red-600 text-white' : 'bg-primary text-white'}`}
                                >
                                    {scanning ? <><CameraOff className="w-4 h-4" /> Apagar cámara</> : <><Camera className="w-4 h-4" /> Encender cámara</>}
                                </button>
                            </div>

                            {cameraError && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{cameraError}</div>
                            )}

                            {scanning && (
                                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-0 border-4 border-white/30 m-8 rounded-2xl pointer-events-none" />
                                </div>
                            )}

                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="Código manual (si el QR no se puede leer)"
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm"
                                    />
                                </div>
                                <button type="submit" disabled={checking} className="px-4 py-2.5 bg-secondary rounded-xl font-bold text-sm disabled:opacity-60">
                                    <Search className="w-4 h-4" />
                                </button>
                            </form>
                        </div>

                        {lastResult && (
                            <div className="rounded-2xl border-2 p-6 space-y-3" style={{ borderColor: resultColor, background: `${resultColor}0f` }}>
                                <div className="flex items-center gap-3">
                                    {lastResult.result === "ok" ? <CheckCircle2 className="w-8 h-8" style={{ color: resultColor }} /> : <XCircle className="w-8 h-8" style={{ color: resultColor }} />}
                                    <h3 className="text-xl font-black" style={{ color: resultColor }}>{RESULT_LABEL[lastResult.result]}</h3>
                                    {lastResult.offline && (
                                        <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-500/15 text-amber-400">Sin conexión</span>
                                    )}
                                </div>
                                {lastResult.holderName && <p className="text-sm"><strong>Comprador:</strong> {lastResult.holderName}</p>}
                                {lastResult.ticketTypeName && <p className="text-sm"><strong>Tipo:</strong> {lastResult.ticketTypeName}</p>}
                                {lastResult.seatLabel && <p className="text-sm"><strong>Asiento:</strong> {lastResult.seatLabel}</p>}
                                {lastResult.result === "already_used" && lastResult.checkedInAt && (
                                    <p className="text-sm flex items-center gap-2 text-amber-700">
                                        <AlertTriangle className="w-4 h-4" />
                                        Ya había entrado el {new Date(lastResult.checkedInAt).toLocaleString('es-MX')}
                                        {lastResult.checkedInByName ? ` (registrado por ${lastResult.checkedInByName})` : ''}
                                    </p>
                                )}
                                {lastResult.offline && lastResult.result === "ok" && (
                                    <p className="text-xs text-amber-700">Se sincronizará cuando vuelva la conexión.</p>
                                )}
                                {!lastResult.offline && lastResult.result === "ok" && lastResult.ticketId && (
                                    <button onClick={handleUndo} disabled={undoing} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-red-600 mt-2">
                                        <RotateCcw className="w-3.5 h-3.5" /> {undoing ? "Revirtiendo..." : "Revertir este ingreso"}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="font-bold mb-4">Últimos escaneos</h3>
                            {recentScans.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Todavía no hay escaneos para este evento.</p>
                            ) : (
                                <div className="space-y-2">
                                    {recentScans.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                                            <span className={s.result === 'ok' ? 'text-success font-bold' : 'text-red-600 font-bold'}>
                                                {RESULT_LABEL[s.result] ?? s.result}
                                            </span>
                                            <span className="text-muted-foreground text-xs">{s.scannedByName} · {new Date(s.scannedAt).toLocaleTimeString('es-MX')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
