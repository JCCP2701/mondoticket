import { useState } from "react";
import {
    Grid3X3,
    Save,
    Trash2,
    Plus,
    Info,
    MousePointer2,
    Square,
    Eraser,
    Navigation,
    Settings,
    Layout
} from "lucide-react";

type Tool = "select" | "block" | "corridor" | "eraser";

interface SeatConfig {
    id: string;
    type: "seat" | "corridor";
    label?: string;
}

export default function VenueDesigner() {
    const [rows, setRows] = useState(12);
    const [cols, setCols] = useState(18);
    const [activeTool, setActiveTool] = useState<Tool>("select");
    const [blockDims, setBlockDims] = useState({ r: 3, c: 5 });
    const [venueSeats, setVenueSeats] = useState<Record<string, SeatConfig>>({});

    const handleSeatAction = (r: number, c: number) => {
        const newVenue = { ...venueSeats };

        if (activeTool === "select") {
            const id = `${r}-${c}`;
            if (newVenue[id]) {
                delete newVenue[id];
            } else {
                newVenue[id] = { id, type: "seat" };
            }
        } else if (activeTool === "eraser") {
            const id = `${r}-${c}`;
            delete newVenue[id];
        } else if (activeTool === "corridor") {
            const id = `${r}-${c}`;
            if (newVenue[id]?.type === "corridor") {
                delete newVenue[id];
            } else {
                newVenue[id] = { id, type: "corridor" };
            }
        } else if (activeTool === "block") {
            for (let i = 0; i < blockDims.r; i++) {
                for (let j = 0; j < blockDims.c; j++) {
                    const targetR = r + i;
                    const targetC = c + j;
                    if (targetR < rows && targetC < cols) {
                        const id = `${targetR}-${targetC}`;
                        newVenue[id] = { id, type: "seat" };
                    }
                }
            }
        }

        setVenueSeats(newVenue);
    };

    const clearCanvas = () => {
        if (confirm("¿Estás seguro de que quieres limpiar todo el diseño?")) {
            setVenueSeats({});
        }
    };

    const enabledSeatsCount = Object.values(venueSeats).filter(s => s.type === "seat").length;
    const corridorCount = Object.values(venueSeats).filter(s => s.type === "corridor").length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Diseñador de Auditorios</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Crea bloques de asientos, pasillos y zonas de exclusión</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={clearCanvas}
                        className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground"
                    >
                        <Trash2 className="w-5 h-5" />
                        Limpiar Canvas
                    </button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20">
                        <Save className="w-5 h-5" />
                        Guardar Plantilla
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Tools Sidebar */}
                <div className="space-y-6">
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
                        <div className="grid grid-cols-2 gap-3">
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
                                onClick={() => setActiveTool("corridor")}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${activeTool === "corridor" ? "border-secondary-foreground bg-secondary-foreground/5 text-secondary-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
                            >
                                <Navigation className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase">Pasillo</span>
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
                                <span className="text-muted-foreground">Boletos Habilitados:</span>
                                <span className="font-bold text-primary">{enabledSeatsCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pasillos/Zonas Muertas:</span>
                                <span className="font-bold text-slate-500">{corridorCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas Designer */}
                <div className="lg:col-span-3">
                    <div className="bg-card rounded-3xl border border-border shadow-inner p-10 flex flex-col items-center min-h-[600px] overflow-auto">
                        {/* Stage */}
                        <div className="w-3/4 h-3 bg-primary/20 rounded-full mb-16 relative flex justify-center">
                            <div className="absolute -top-12 px-6 py-2 bg-secondary border border-border rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm">
                                Escenario Principal
                            </div>
                        </div>

                        {/* Seat Grid */}
                        <div
                            className="grid p-4 bg-secondary/5 rounded-2xl border border-dashed border-border transition-all"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                                gap: '6px'
                            }}
                        >
                            {Array.from({ length: rows }).map((_, r) => (
                                Array.from({ length: cols }).map((_, c) => {
                                    const id = `${r}-${c}`;
                                    const config = venueSeats[id];
                                    const isSeat = config?.type === "seat";
                                    const isCorridor = config?.type === "corridor";

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => handleSeatAction(r, c)}
                                            className={`
                                                w-8 h-8 rounded-lg transition-all flex items-center justify-center text-[8px] font-bold group
                                                ${isSeat
                                                    ? "bg-primary text-white shadow-md shadow-primary/20 border-primary scale-105"
                                                    : isCorridor
                                                        ? "bg-slate-200 text-slate-400 border-slate-300"
                                                        : "bg-background border-border hover:bg-secondary/80 hover:scale-110"
                                                }
                                                border
                                            `}
                                            title={isSeat ? `Fila ${r + 1}, Asiento ${c + 1}` : isCorridor ? 'Zona de Pasillo' : 'Espacio Vacío'}
                                        >
                                            {isSeat ? `${r + 1}-${c + 1}` : ""}
                                            {/* Tool Highlight Effect */}
                                            {!config && (
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                                                    {activeTool === "block" && <div className="w-full h-full bg-primary/10 rounded-lg border border-primary/30" />}
                                                    {activeTool === "corridor" && <div className="w-full h-full bg-slate-400/20 rounded-lg border border-slate-400/30" />}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="mt-16 flex gap-12 p-6 bg-secondary/30 rounded-2xl border border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-primary rounded-md shadow-sm" />
                                <span className="text-xs font-bold">Asiento Habilitado</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-slate-200 border border-slate-300 rounded-md" />
                                <span className="text-xs font-bold text-muted-foreground">Pasillo / Zona Muerta</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-background border border-border rounded-md" />
                                <span className="text-xs font-bold text-muted-foreground">Espacio Indefinido</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
