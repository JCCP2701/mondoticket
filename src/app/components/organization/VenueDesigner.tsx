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
    Tag,
    Plus
} from "lucide-react";
import { dataService, EventRecord, TicketType } from "../../services/dataService";
import { cn } from "../ui/utils";

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

// Cortesía es un tipo de boleto DEFAULT: su cantidad la define exclusivamente
// el contrato de la organización (fijo o %, migración 0040) — el organizador
// nunca la crea ni la agranda a mano. Se identifica por este nombre
// reservado; el formulario "+ Agregar tipo de boleto" rechaza precio $0
// explícitamente para que nunca se cree "a mano" un duplicado.
const COURTESY_TYPE_NAME = "Cortesía";

// La cortesía sale DEL aforo que el organizador ya configuró en sus tipos de
// aforo general — nunca se suma aparte (si no, "General: 1000" + "Cortesía:
// 100" se vería como un evento de 1100 boletos, cuando el organizador
// pidió 1000 en total). delta > 0: quitarle (más) capacidad a los tipos
// pagados para dársela a cortesía. delta < 0: devolverles lo que cortesía
// ya no necesita (el contrato bajó). Con asientos no hace falta nada de
// esto: pintar un asiento existente ya se lo quita a su tipo anterior, el
// total físico de asientos del grid nunca cambia.
async function adjustGeneralTypesForCourtesyDelta(nonCourtesyTypes: TicketType[], delta: number): Promise<void> {
    if (delta === 0) return;
    const donors = nonCourtesyTypes.filter((t) => !t.hasSeatMap);
    if (donors.length === 0) return;

    if (delta > 0) {
        let remaining = delta;
        const sorted = [...donors].sort((a, b) => (b.capacity - b.sold) - (a.capacity - a.sold));
        for (const t of sorted) {
            if (remaining <= 0) break;
            const minCapacity = Math.max(t.sold, 1); // check(capacity > 0)
            const room = t.capacity - minCapacity;
            const take = Math.min(remaining, room);
            if (take > 0) {
                await dataService.updateEventTicketType(t.id, { capacity: t.capacity - take });
                remaining -= take;
            }
        }
    } else {
        // Devolver: se lo damos completo al tipo de mayor capacidad actual
        // (no importa cuál lo "recupere", es solo un número administrativo).
        const sorted = [...donors].sort((a, b) => b.capacity - a.capacity);
        const receiver = sorted[0];
        await dataService.updateEventTicketType(receiver.id, { capacity: receiver.capacity + (-delta) });
    }
}

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

    // Boletos de aforo general: capacidad editable directamente aquí (antes
    // era imposible tocarla después de crear el evento).
    const [generalCapacityDrafts, setGeneralCapacityDrafts] = useState<Record<string, string>>({});
    const [savingCapacityId, setSavingCapacityId] = useState<string | null>(null);
    const [capacityError, setCapacityError] = useState("");

    // "+ Agregar tipo de boleto" — desbloquea crear tipos nuevos (pagados)
    // en un evento que ya existe, algo que antes no era posible en ninguna
    // pantalla. Cortesía NUNCA se crea aquí (ver COURTESY_TYPE_NAME arriba).
    const [newType, setNewType] = useState({ name: "", price: "", capacity: "", hasSeatMap: false });
    const [creatingType, setCreatingType] = useState(false);
    const [createTypeError, setCreateTypeError] = useState("");

    // Cuántas cortesías permite el contrato para ESTE evento — tope real
    // (además del que ya aplica el RPC al momento de vender) para no dejar
    // ni pintar más asientos de cortesía de los que el contrato autoriza.
    const [courtesyTarget, setCourtesyTarget] = useState<number | null>(null);
    const [courtesyLimitMessage, setCourtesyLimitMessage] = useState("");

    const loadEvent = async () => {
        if (!eventId) return;
        const [loadedEvent, seats, orgs] = await Promise.all([
            dataService.getEventById(eventId),
            dataService.getSeatMap(eventId),
            dataService.getOrganizations(),
        ]);
        if (!loadedEvent) { setEvent(null); return; }

        // Cortesía es un tipo default cuya cantidad SOLO define el contrato
        // (fijo o %) — se auto-provisiona/resincroniza aquí, nunca a mano.
        // La cortesía SALE del aforo que el organizador ya configuró, nunca
        // se suma aparte: si "General" tiene 1000 y el contrato pide 100,
        // "General" se reduce a 900 para que el total del evento siga en
        // 1000, no 1100.
        const org = orgs.find((o) => o.id === loadedEvent.organizationId);
        const nonCourtesyTypes = loadedEvent.ticketTypes.filter((t) => t.name !== COURTESY_TYPE_NAME);
        const existingCourtesy = loadedEvent.ticketTypes.find((t) => t.name === COURTESY_TYPE_NAME);
        // Total "real" del evento incluye lo ya reservado para cortesía —
        // así el % no se recalcula sobre una base que se va encogiendo cada
        // vez que se recarga (evita un feedback loop en modo porcentaje).
        const totalEventCapacity = nonCourtesyTypes.reduce((s, t) => s + t.capacity, 0) + (existingCourtesy?.capacity ?? 0);
        const target = org
            ? (org.courtesyMode === "percentage"
                ? (org.courtesyPercentage != null ? Math.round((totalEventCapacity * org.courtesyPercentage) / 100) : null)
                : org.courtesyTicketsPerEvent)
            : null;
        setCourtesyTarget(target);

        if (target != null && target > 0) {
            if (!existingCourtesy) {
                const hasSeats = nonCourtesyTypes.some((t) => t.hasSeatMap);
                if (!hasSeats) {
                    // Aforo general: hay que restarle el hueco a los tipos
                    // pagados existentes ANTES de crear Cortesía, si no, el
                    // total del evento crece en vez de mantenerse.
                    await adjustGeneralTypesForCourtesyDelta(nonCourtesyTypes, target);
                }
                await dataService.createEventTicketType({
                    eventId: loadedEvent.id,
                    name: COURTESY_TYPE_NAME,
                    price: 0,
                    // Con asientos: la capacidad real la controla el trigger
                    // de event_seats según lo que se pinte (tope 1 mientras
                    // no hay ningún asiento pintado, check(capacity>0) obliga
                    // a un valor positivo) — pintar un asiento existente ya
                    // se lo "quita" a su tipo anterior, sin tocar totales.
                    // Sin asientos: la capacidad ES el número del contrato.
                    capacity: hasSeats ? 1 : target,
                    hasSeatMap: hasSeats,
                });
                return loadEvent(); // recarga con el tipo ya creado
            } else if (!existingCourtesy.hasSeatMap) {
                const synced = Math.max(target, existingCourtesy.sold);
                const delta = synced - existingCourtesy.capacity;
                if (delta !== 0) {
                    // delta > 0: el contrato pide más cortesías, hay que
                    // quitarle (más) a los tipos pagados. delta < 0: el
                    // contrato pide menos, se les devuelve lo que sobra.
                    await adjustGeneralTypesForCourtesyDelta(nonCourtesyTypes, delta);
                    await dataService.updateEventTicketType(existingCourtesy.id, { capacity: synced });
                    return loadEvent(); // recarga con la capacidad ya sincronizada
                }
            }
        }

        setEvent(loadedEvent);
        setGeneralCapacityDrafts(
            Object.fromEntries(
                loadedEvent.ticketTypes.filter((t) => !t.hasSeatMap).map((t) => [t.id, String(t.capacity)])
            )
        );
        const firstSeated = loadedEvent.ticketTypes.find((t) => t.hasSeatMap);
        if (firstSeated) setActiveTicketTypeId(firstSeated.id);
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
    };

    useEffect(() => {
        if (!eventId) return;
        setLoading(true);
        loadEvent().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const handleCreateType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) return;
        setCreateTypeError("");
        const price = parseFloat(newType.price);
        const capacity = parseInt(newType.capacity, 10);
        if (!newType.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(capacity) || capacity <= 0) {
            setCreateTypeError("Completa nombre, precio y capacidad (mayor a 0).");
            return;
        }
        if (price === 0 || newType.name.trim().toLowerCase() === COURTESY_TYPE_NAME.toLowerCase()) {
            setCreateTypeError('Las cortesías se administran solas según tu contrato — no se pueden crear aquí con precio $0.');
            return;
        }
        setCreatingType(true);
        try {
            await dataService.createEventTicketType({
                eventId, name: newType.name.trim(), price, capacity, hasSeatMap: newType.hasSeatMap,
            });
            setNewType({ name: "", price: "", capacity: "", hasSeatMap: false });
            await loadEvent();
        } catch (err: any) {
            setCreateTypeError(err.message || "No se pudo crear el tipo de boleto");
        } finally {
            setCreatingType(false);
        }
    };

    const handleSaveCapacity = async (typeId: string) => {
        setCapacityError("");
        const value = parseInt(generalCapacityDrafts[typeId] ?? "", 10);
        if (!Number.isFinite(value) || value <= 0) {
            setCapacityError("La capacidad debe ser un número mayor a 0.");
            return;
        }
        setSavingCapacityId(typeId);
        try {
            await dataService.updateEventTicketType(typeId, { capacity: value });
            await loadEvent();
        } catch (err: any) {
            setCapacityError(err.message || "No se pudo actualizar la capacidad");
        } finally {
            setSavingCapacityId(null);
        }
    };

    // Un tipo de aforo general no tiene nada que pintar — solo los tipos con
    // asientos entran a la paleta/leyenda del canvas.
    const seatMappedTypes = event?.ticketTypes.filter((t) => t.hasSeatMap) ?? [];
    const generalTypes = event?.ticketTypes.filter((t) => !t.hasSeatMap) ?? [];

    const typeColor = useMemo(() => {
        const m: Record<string, string> = {};
        (event?.ticketTypes ?? []).filter((t) => t.hasSeatMap).forEach((t, i) => { m[t.id] = PALETTE[i % PALETTE.length]; });
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

    // Tope de pintado para el tipo Cortesía: además del límite real que ya
    // aplica el RPC al momento de vender, esto evita que el organizador
    // pinte más asientos "de cortesía" de los que su contrato autoriza —
    // "no permitir agregar ni un boleto más de cortesía".
    const courtesyTypeId = event?.ticketTypes.find((t) => t.name === COURTESY_TYPE_NAME)?.id;

    const handleSeatAction = (r: number, c: number) => {
        if (!activeTicketTypeId) return;
        setCourtesyLimitMessage("");
        const isCourtesyBrush = activeTicketTypeId === courtesyTypeId && courtesyTarget != null;
        let courtesyPainted = isCourtesyBrush
            ? Object.values(venueSeats).filter((cell) => cell.ticketTypeId === courtesyTypeId).length
            : 0;

        const tryPlace = (targetR: number, targetC: number) => {
            const key = `${targetR}-${targetC}`;
            if (isCourtesyBrush && venueSeats[key]?.ticketTypeId !== courtesyTypeId) {
                if (courtesyPainted >= (courtesyTarget as number)) return false;
                courtesyPainted += 1;
            }
            placeCell(targetR, targetC, activeTicketTypeId);
            return true;
        };

        if (activeTool === "select") {
            if (venueSeats[`${r}-${c}`]) removeCell(r, c);
            else if (!tryPlace(r, c)) setCourtesyLimitMessage(`Ya alcanzaste el límite de cortesías de tu contrato (${courtesyTarget}).`);
        } else if (activeTool === "eraser") {
            removeCell(r, c);
        } else if (activeTool === "block") {
            let blocked = false;
            for (let i = 0; i < blockDims.r; i++) {
                for (let j = 0; j < blockDims.c; j++) {
                    const targetR = r + i, targetC = c + j;
                    if (targetR < rows && targetC < cols) {
                        if (!tryPlace(targetR, targetC)) blocked = true;
                    }
                }
            }
            if (blocked) setCourtesyLimitMessage(`Ya alcanzaste el límite de cortesías de tu contrato (${courtesyTarget}) — no se pintó todo el bloque.`);
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
            {saveSuccess && <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">Mapa guardado correctamente.</div>}
            {courtesyLimitMessage && <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">{courtesyLimitMessage}</div>}

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Tools Sidebar */}
                <div className="space-y-6">
                    {/* Agregar tipo de boleto — antes esto solo se podía hacer al
                        crear el evento; ahora también aquí, en un evento ya
                        existente (ej. para agregar una cortesía $0 después). */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-2 flex items-center gap-2 text-primary">
                            <Plus className="w-4 h-4" />
                            Agregar Tipo de Boleto
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            💡 Solo tipos pagados (precio mayor a $0). Las cortesías las administra MondoTicket automáticamente según tu contrato — aparecen abajo con el tipo "Cortesía" ya creado; si tiene asientos, elígelo como pincel para marcar cuáles regalas, sin pasarte del límite de tu convenio.
                        </p>
                        <form onSubmit={handleCreateType} className="space-y-3">
                            <input
                                type="text"
                                value={newType.name}
                                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                placeholder="Nombre (ej. VIP Cortesía)"
                                className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number" min="0" step="0.01"
                                    value={newType.price}
                                    onChange={(e) => setNewType({ ...newType, price: e.target.value })}
                                    placeholder="Precio"
                                    className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none text-sm"
                                />
                                <input
                                    type="number" min="1"
                                    value={newType.capacity}
                                    onChange={(e) => setNewType({ ...newType, capacity: e.target.value })}
                                    placeholder="Capacidad"
                                    className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background outline-none text-sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewType({ ...newType, hasSeatMap: false })}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors",
                                        !newType.hasSeatMap ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                                    )}
                                >
                                    Aforo general
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewType({ ...newType, hasSeatMap: true })}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors",
                                        newType.hasSeatMap ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                                    )}
                                >
                                    Con asientos
                                </button>
                            </div>
                            {createTypeError && <p className="text-xs text-destructive font-bold">{createTypeError}</p>}
                            <button
                                type="submit"
                                disabled={creatingType}
                                className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-60"
                            >
                                {creatingType ? "Creando..." : "Crear tipo de boleto"}
                            </button>
                        </form>
                    </div>

                    {/* Ticket type palette — solo tipos con asientos: uno de
                        aforo general no tiene nada que pintar. */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                            <Tag className="w-4 h-4" />
                            Tipo de Boleto a Pintar
                        </h3>
                        {seatMappedTypes.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Todavía no hay tipos "con asientos" — créalo arriba para poder pintar el mapa.</p>
                        ) : (
                        <div className="space-y-2">
                            {seatMappedTypes.map((t) => (
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
                        )}
                    </div>

                    {/* Boletos de aforo general — sin grid que pintar, solo su
                        capacidad total, ahora editable (antes era imposible
                        tocarla después de crear el evento). */}
                    {generalTypes.length > 0 && (
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                                <Info className="w-4 h-4" />
                                Boletos de Aforo General
                            </h3>
                            <div className="space-y-4">
                                {generalTypes.map((t) => (
                                    <div key={t.id} className="p-3 rounded-xl border border-border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm">{t.name}</span>
                                            <span className="text-xs text-muted-foreground">${t.price} · {t.sold} vendidos</span>
                                        </div>
                                        {t.name === COURTESY_TYPE_NAME ? (
                                            <p className="text-xs text-muted-foreground italic">
                                                {t.capacity} cortesías según tu convenio (no editable — lo define el contrato)
                                            </p>
                                        ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={t.sold}
                                                value={generalCapacityDrafts[t.id] ?? String(t.capacity)}
                                                onChange={(e) => setGeneralCapacityDrafts({ ...generalCapacityDrafts, [t.id]: e.target.value })}
                                                className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background outline-none text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveCapacity(t.id)}
                                                disabled={savingCapacityId === t.id}
                                                className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60"
                                            >
                                                {savingCapacityId === t.id ? "..." : "Guardar"}
                                            </button>
                                        </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {capacityError && <p className="text-xs text-destructive font-bold mt-3">{capacityError}</p>}
                        </div>
                    )}

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
                            {generalTypes.length > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Aforo General:</span>
                                    <span className="font-bold">{generalTypes.reduce((s, t) => s + t.capacity, 0)} boletos</span>
                                </div>
                            )}
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
                            {seatMappedTypes.map((t) => (
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
