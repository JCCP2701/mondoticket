import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import {
    Save,
    Trash2,
    Info,
    MousePointer2,
    Square,
    Eraser,
    Settings,
    Layout,
    ArrowLeft,
    Tag
} from "lucide-react";
import { dataService, EventRecord } from "../../services/dataService";

type Tool = "select" | "block" | "eraser";

interface SeatCell {
    rowLabel: string;
    seatNumber: string;
    ticketTypeId: string;
}

function rowIndexToLabel(r: number): string {
    let label = "";
    let n = r;
    do {
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
}

const PALETTE = ["#d4af37", "#328022", "#9cc183", "#a6821f", "#4f9e3a", "#6b685f"];

export default function VenueDesigner() {
    const { eventId } = useParams();
    const [event, setEvent] = useState<EventRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(18);
    const [activeTool, setActiveTool] = useState<Tool>("select");
    const [blockDims, setBlockDims] = useState({ r: 3, c: 5 });
    const [activeTicketTypeId, setActiveTicketTypeId] = useState<string>("");
    const [venueSeats, setVenueSeats] = useState<Record<string, SeatCell>>({});

    useEffect(() => {
        if (!eventId) return;
        (async () => {
            setLoading(true);
            const [loadedEvent, seats] = await Promise.all([
                dataService.getEventById(eventId),
                dataService.getSeatMap(eventId),
            ]);
            setEvent(loadedEvent);
            if (loadedEvent && loadedEvent.ticketTypes.length > 0) {
                setActiveTicketTypeId(loadedEvent.ticketTypes[0].id);
            }
            if (seats.length > 0) {
                const map: Record<string, SeatCell> = {};
                let maxRow = 0, maxCol = 0;
                for (const s of seats) {
                    map[`${s.rowIndex}-${s.colIndex}`] = {
                        rowLabel: s.rowLabel,
                        seatNumber: s.seatNumber,
                        ticketTypeId: s.ticketTypeId,
                    };
                    maxRow = Math.max(maxRow, s.rowIndex);
                    maxCol = Math.max(maxCol, s.colIndex);
                }
                setVenueSeats(map);
                setRows(Math.max(12, maxRow + 1));
                setCols(Math.max(18, maxCol + 1));
            }
            setLoading(false);
        })();
    }, [eventId]);

    const typeColor = useMemo(() => {
        const m: Record<string, string> = {};
        (event?.ticketTypes ?? []).forEach((t, i) => { m[t.id] = PALETTE[i % PALETTE.length]; });
        return m;
    }, [event]);

    const placeCell = (r: number, c: number, typeId: string) => {
        setVenueSeats((prev) => ({
            ...prev,
            [`${r}-${c}`]: { rowLabel: rowIndexToLabel(r), seatNumber: String(c + 1), ticketTypeId: typeId },
        }));
    };

    const removeCell = (r: number, c: number) => {
        setVenueSeats((prev) => {
            const next = { ...prev };
            delete next[`${r}-${c}`];
            return next;
        });
    };

    const handleSeatAction = (r: number, c: number) => {
        if (!activeTicketTypeId) return;

        if (activeTool === "select") {
            if (venueSeats[`${r}-${c}`]) removeCell(r, c);
            else placeCell(r, c, activeTicketTypeId);
        } else if (activeTool === "eraser") {
            removeCell(r, c);
        } else if (activeTool === "block") {
            for (let i = 0; i < blockDims.r; i++) {
                for (let j = 0; j < blockDims.c; j++) {
                    const targetR = r + i, targetC = c + j;
                    if (targetR < rows && targetC < cols) placeCell(targetR, targetC, activeTicketTypeId);
                }
            }
        }
    };

    const clearCanvas = () => {
        if (confirm("¿Estás seguro de que quieres limpiar todo el diseño? Se eliminará al guardar.")) {
            setVenueSeats({});
        }
    };

    const handleSave = async () => {
        if (!eventId) return;
        setSaving(true);
        setSaveError("");
        setSaveSuccess(false);
        try {
            const seats = Object.entries(venueSeats).map(([key, cell]) => {
                const [rowIndex, colIndex] = key.split("-").map(Number);
                return {
                    rowIndex, colIndex,
                    rowLabel: cell.rowLabel,
                    seatNumber: cell.seatNumber,
                    ticketTypeId: cell.ticketTypeId,
                };
            });
            await dataService.saveSeatMap(eventId, seats);
            setSaveSuccess(true);
        } catch (err: any) {
            setSaveError(err.message || "No se pudo guardar el mapa de asientos");
        } finally {
            setSaving(false);
        }
    };

    const seatCount = Object.keys(venueSeats).length;

    if (loading) return <div className="p-8 text-muted-foreground">Cargando evento...</div>;
    if (!event) return <div className="p-8 text-muted-foreground">Evento no encontrado.</div>;
    if (event.ticketTypes.length === 0) {
        return (
            <div className="p-8 space-y-4">
                <p className="text-muted-foreground">Este evento no tiene tipos de boleto todavía. Crea al menos uno antes de diseñar el mapa de asientos.</p>
                <Link to={`/organization/event/${eventId}`} className="text-primary font-bold inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver al evento
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
            <div className="flex justify-between items-center">
                <div>
                    <Link to={`/organization/event/${eventId}`} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2 mb-2">
                        <ArrowLeft className="w-4 h-4" /> {event.name}
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Diseñador de Asientos</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Asigna asientos a cada tipo de boleto de este evento</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={clearCanvas}
                        className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground"
                    >
                        <Trash2 className="w-5 h-5" />
                        Limpiar Canvas
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? "Guardando..." : "Guardar Mapa de Asientos"}
                    </button>
                </div>
            </div>

            {saveError && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>}
            {saveSuccess && <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">Mapa guardado correctamente.</div>}

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Tools Sidebar */}
                <div className="space-y-6">
                    {/* Ticket type palette */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                            <Tag className="w-4 h-4" />
                            Tipo de Boleto a Pintar
                        </h3>
                        <div className="space-y-2">
                            {event.ticketTypes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTicketTypeId(t.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all text-left ${activeTicketTypeId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}
                                >
                                    <div className="w-4 h-4 rounded-md shrink-0" style={{ background: typeColor[t.id] }} />
                                    <span className="font-bold text-sm">{t.name}</span>
                                    <span className="text-xs text-muted-foreground ml-auto">${t.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Size Config */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                            <Layout className="w-4 h-4" />
                            Lienzo (Grid)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase">Filas</label>
                                <input
                                    type="number"
                                    value={rows}
                                    onChange={(e) => setRows(Math.min(50, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase">Columnas</label>
                                <input
                                    type="number"
                                    value={cols}
                                    onChange={(e) => setCols(Math.min(50, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                            <Settings className="w-4 h-4" />
                            Herramientas
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setActiveTool("select")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${activeTool === "select" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                            >
                                <MousePointer2 className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase">Selector</span>
                            </button>
                            <button
                                onClick={() => setActiveTool("block")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${activeTool === "block" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                            >
                                <Square className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase">Bloque</span>
                            </button>
                            <button
                                onClick={() => setActiveTool("eraser")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${activeTool === "eraser" ? "border-red-500 bg-red-50 text-red-600" : "border-border text-muted-foreground hover:bg-secondary"}`}
                            >
                                <Eraser className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase">Borrador</span>
                            </button>
                        </div>

                        {activeTool === "block" && (
                            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4 animate-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-primary mb-2">Tamaño del Bloque</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder="R"
                                        className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-sm"
                                        value={blockDims.r}
                                        onChange={(e) => setBlockDims({ ...blockDims, r: parseInt(e.target.value) || 1 })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="C"
                                        className="w-full px-3 py-2 rounded-lg bg-background border border-primary/20 text-sm"
                                        value={blockDims.c}
                                        onChange={(e) => setBlockDims({ ...blockDims, c: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic text-center">Haz clic en el grid para colocar el bloque</p>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="bg-secondary/20 p-6 rounded-2xl border border-border">
                        <div className="flex items-center gap-2 font-bold mb-4">
                            <Info className="w-4 h-4 text-primary" />
                            Resumen de Capacidad
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Área Total:</span>
                                <span className="font-bold">{rows * cols} unidades</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Asientos Colocados:</span>
                                <span className="font-bold text-primary">{seatCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas Designer */}
                <div className="lg:col-span-3">
                    <div className="bg-card rounded-3xl border border-border shadow-inner p-10 flex flex-col items-center min-h-[600px] overflow-auto">
                        <div className="w-3/4 h-3 bg-primary/20 rounded-full mb-16 relative flex justify-center">
                            <div className="absolute -top-12 px-6 py-2 bg-secondary border border-border rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm">
                                Escenario Principal
                            </div>
                        </div>

                        <div
                            className="grid p-4 bg-secondary/5 rounded-2xl border border-dashed border-border transition-all"
                            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '6px' }}
                        >
                            {Array.from({ length: rows }).map((_, r) => (
                                Array.from({ length: cols }).map((_, c) => {
                                    const id = `${r}-${c}`;
                                    const cell = venueSeats[id];

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => handleSeatAction(r, c)}
                                            className="w-8 h-8 rounded-lg transition-all flex items-center justify-center text-[8px] font-bold border border-border hover:scale-110"
                                            style={cell ? { background: typeColor[cell.ticketTypeId], color: 'white', borderColor: typeColor[cell.ticketTypeId] } : { background: 'var(--background)' }}
                                            title={cell ? `${cell.rowLabel}${cell.seatNumber}` : 'Espacio vacío'}
                                        >
                                            {cell ? `${cell.rowLabel}${cell.seatNumber}` : ""}
                                        </button>
                                    );
                                })
                            ))}
                        </div>

                        <div className="mt-16 flex flex-wrap gap-6 p-6 bg-secondary/30 rounded-2xl border border-border">
                            {event.ticketTypes.map((t) => (
                                <div key={t.id} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-md shadow-sm" style={{ background: typeColor[t.id] }} />
                                    <span className="text-xs font-bold">{t.name}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-background border border-border rounded-md" />
                                <span className="text-xs font-bold text-muted-foreground">Espacio Vacío / Pasillo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
