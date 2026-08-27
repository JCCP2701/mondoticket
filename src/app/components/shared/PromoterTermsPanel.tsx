import { useEffect, useState } from "react";
import { Plus, Percent, Trash2, Pencil, Target, CalendarRange } from "lucide-react";
import { dataService, PromoterTerms, PromoterGoal } from "../../services/dataService";

function CommissionForm({ initial, onSave, onCancel }: {
    initial?: PromoterTerms;
    onSave: (input: { commissionPercentage: number; notes: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [commissionPercentage, setCommissionPercentage] = useState(initial ? String(initial.commissionPercentage) : "");
    const [notes, setNotes] = useState(initial?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const pct = Number(commissionPercentage);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
            setError("Ingresa un % entre 0 y 100.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({ commissionPercentage: pct, notes });
        } catch (err: any) {
            setError(err.message || "No se pudo guardar la comisión");
            setSaving(false);
        }
    };

    return (
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
            <div className="relative">
                <input
                    type="number" min={0} max={100} step="0.01"
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(e.target.value)}
                    placeholder="Ej. 10"
                    className="w-full px-3 py-2.5 pr-8 rounded-xl border-2 border-border bg-background outline-none text-sm"
                />
                <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de la comisión (opcional)"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm resize-none"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-60">
                    {saving ? "Guardando..." : "Guardar comisión"}
                </button>
            </div>
        </div>
    );
}

function GoalForm({ initial, onSave, onCancel }: {
    initial?: PromoterGoal;
    onSave: (input: { periodStart: string; periodEnd: string; targetTicketCount: number; notes: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [periodStart, setPeriodStart] = useState(initial?.periodStart ?? "");
    const [periodEnd, setPeriodEnd] = useState(initial?.periodEnd ?? "");
    const [targetTicketCount, setTargetTicketCount] = useState(initial ? String(initial.targetTicketCount) : "");
    const [notes, setNotes] = useState(initial?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const target = Number(targetTicketCount);
        if (!periodStart || !periodEnd) {
            setError("Selecciona el inicio y el fin del periodo.");
            return;
        }
        if (periodEnd < periodStart) {
            setError("El fin del periodo debe ser posterior al inicio.");
            return;
        }
        if (!Number.isFinite(target) || target <= 0) {
            setError("Ingresa una meta de boletos válida.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({ periodStart, periodEnd, targetTicketCount: target, notes });
        } catch (err: any) {
            setError(err.message || "No se pudo guardar el periodo");
            setSaving(false);
        }
    };

    return (
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Inicio del periodo</label>
                    <input
                        type="date" value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Fin del periodo</label>
                    <input
                        type="date" value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm"
                    />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Meta de boletos</label>
                <input
                    type="number" min={1} step="1"
                    value={targetTicketCount}
                    onChange={(e) => setTargetTicketCount(e.target.value)}
                    placeholder="Ej. 100"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm"
                />
            </div>
            <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas del periodo (opcional)"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm resize-none"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-60">
                    {saving ? "Guardando..." : "Guardar periodo"}
                </button>
            </div>
        </div>
    );
}

// `period_start`/`period_end` come back as plain YYYY-MM-DD strings — parse
// them as local calendar dates (not UTC) so the displayed day never shifts.
function formatDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return value;
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Self-contained editor for one promoter's commission terms and sales-goal
// periods within one organization. Used both from the superadmin "Promotores"
// screen and from an organization manager's own promoter management screen —
// it does not assume which one is rendering it, it only needs the ids.
export default function PromoterTermsPanel({ promoterProfileId, promoterName, organizationId, organizationName }: {
    promoterProfileId: string;
    promoterName: string;
    organizationId: string;
    organizationName?: string;
}) {
    const [terms, setTerms] = useState<PromoterTerms | null>(null);
    const [goals, setGoals] = useState<PromoterGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingTerms, setEditingTerms] = useState(false);
    const [addingGoal, setAddingGoal] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        setError("");
        Promise.all([
            dataService.getPromoterTermsForOrganization(organizationId),
            dataService.getPromoterGoals(promoterProfileId, organizationId),
        ]).then(([orgTerms, promoterGoals]) => {
            // At most one promoter_terms row per promoter+org (unique constraint).
            setTerms(orgTerms.find((t) => t.promoterProfileId === promoterProfileId) ?? null);
            setGoals(promoterGoals);
            setLoading(false);
        }).catch((err: any) => {
            setError(err.message || "No se pudo cargar la información del promotor");
            setLoading(false);
        });
    };

    useEffect(() => {
        load();
        setEditingTerms(false);
        setAddingGoal(false);
        setEditingGoalId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promoterProfileId, organizationId]);

    const handleCreateTerms = async (input: { commissionPercentage: number; notes: string }) => {
        await dataService.createPromoterTerms({ promoterProfileId, organizationId, ...input });
        setEditingTerms(false);
        load();
    };

    const handleUpdateTerms = async (input: { commissionPercentage: number; notes: string }) => {
        if (!terms) return;
        await dataService.updatePromoterTerms(terms.id, input);
        setEditingTerms(false);
        load();
    };

    const handleDeleteTerms = async () => {
        if (!terms) return;
        if (!confirm("¿Eliminar la comisión de este promotor? Dejará de ganar comisión en esta organización.")) return;
        await dataService.deletePromoterTerms(terms.id);
        load();
    };

    const handleCreateGoal = async (input: { periodStart: string; periodEnd: string; targetTicketCount: number; notes: string }) => {
        await dataService.createPromoterGoal({ promoterProfileId, organizationId, ...input });
        setAddingGoal(false);
        load();
    };

    const handleUpdateGoal = async (id: string, input: { periodStart: string; periodEnd: string; targetTicketCount: number; notes: string }) => {
        await dataService.updatePromoterGoal(id, input);
        setEditingGoalId(null);
        load();
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm("¿Eliminar este periodo de meta?")) return;
        await dataService.deletePromoterGoal(id);
        load();
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Cargando...</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold">{promoterName}</h2>
                {organizationName && <p className="text-xs text-muted-foreground">{organizationName}</p>}
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            {/* Comisión */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Percent className="w-4 h-4 text-primary" /> Comisión
                    </h3>
                    {terms && !editingTerms && (
                        <div className="flex items-center gap-1">
                            <button onClick={() => setEditingTerms(true)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground" title="Editar comisión">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={handleDeleteTerms} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground" title="Eliminar comisión">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {editingTerms ? (
                    <CommissionForm
                        initial={terms ?? undefined}
                        onCancel={() => setEditingTerms(false)}
                        onSave={terms ? handleUpdateTerms : handleCreateTerms}
                    />
                ) : terms ? (
                    <div className="px-4 py-3 rounded-xl border border-border bg-secondary/20">
                        <p className="text-sm font-bold">{terms.commissionPercentage}%</p>
                        {terms.notes && <p className="text-xs text-muted-foreground mt-1">{terms.notes}</p>}
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground italic">Sin comisión configurada</p>
                        <button onClick={() => setEditingTerms(true)} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                            <Plus className="w-4 h-4" /> Configurar comisión
                        </button>
                    </div>
                )}
            </div>

            {/* Metas */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Metas
                </h3>

                {goals.length === 0 && !addingGoal && (
                    <p className="text-sm text-muted-foreground italic">Este promotor todavía no tiene periodos de meta.</p>
                )}

                {goals.length > 0 && (
                    <div className="space-y-3">
                        {goals.map((g) => editingGoalId === g.id ? (
                            <GoalForm
                                key={g.id}
                                initial={g}
                                onCancel={() => setEditingGoalId(null)}
                                onSave={(input) => handleUpdateGoal(g.id, input)}
                            />
                        ) : (
                            <div key={g.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/20">
                                <div>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        <CalendarRange className="w-3.5 h-3.5 text-muted-foreground" />
                                        {formatDate(g.periodStart)} – {formatDate(g.periodEnd)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Meta: {g.targetTicketCount} boletos{g.notes ? ` · ${g.notes}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingGoalId(g.id)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground" title="Editar periodo">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteGoal(g.id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground" title="Eliminar periodo">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {addingGoal ? (
                    <GoalForm onCancel={() => setAddingGoal(false)} onSave={handleCreateGoal} />
                ) : (
                    <button onClick={() => setAddingGoal(true)} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                        <Plus className="w-4 h-4" /> Agregar periodo
                    </button>
                )}
            </div>
        </div>
    );
}
