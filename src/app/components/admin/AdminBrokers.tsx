import { useEffect, useState } from "react";
import { Plus, X, Handshake, Percent, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { dataService, Organization, BrokerContract } from "../../services/dataService";
import { AuthUser } from "../../context/AuthContext";

const BASIS_LABEL: Record<BrokerContract['commissionBasis'], string> = {
    ticket_revenue: 'Venta de boletos',
    platform_fee: 'Fee de la plataforma',
};

function CreateBrokerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            setError("Nombre y correo son obligatorios.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const res = await dataService.inviteStaff(name.trim(), email.trim(), 'broker', []);
            setResult(res);
            onCreated();
        } catch (err: any) {
            setError(err.message || "No se pudo crear el broker");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-md w-full space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Nuevo Broker</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {result ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                            Cuenta creada para <strong>{result.email}</strong>.
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Contraseña temporal</p>
                            <p className="font-mono text-sm">{result.temporaryPassword}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Ahora agrégale uno o varios contratos por organización desde la lista.</p>
                        <button onClick={onClose} className="w-full py-3 bg-primary text-white rounded-xl font-bold">Cerrar</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Nombre</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none" placeholder="Nombre completo" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Correo</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none" placeholder="correo@ejemplo.com" />
                        </div>
                        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60">
                            {submitting ? "Creando..." : "Crear Broker"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function ContractForm({ organizations, initial, onSave, onCancel }: {
    organizations: Organization[];
    initial?: BrokerContract;
    onSave: (input: { organizationId: string; commissionBasis: BrokerContract['commissionBasis']; commissionPercentage: number; notes: string }) => Promise<void>;
    onCancel: () => void;
}) {
    const [organizationId, setOrganizationId] = useState(initial?.organizationId ?? "");
    const [commissionBasis, setCommissionBasis] = useState<BrokerContract['commissionBasis']>(initial?.commissionBasis ?? 'ticket_revenue');
    const [commissionPercentage, setCommissionPercentage] = useState(initial ? String(initial.commissionPercentage) : "");
    const [notes, setNotes] = useState(initial?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        const pct = Number(commissionPercentage);
        if (!organizationId || !Number.isFinite(pct) || pct < 0 || pct > 100) {
            setError("Selecciona una organización y un % entre 0 y 100.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({ organizationId, commissionBasis, commissionPercentage: pct, notes });
        } catch (err: any) {
            setError(err.message || "No se pudo guardar el contrato");
            setSaving(false);
        }
    };

    return (
        <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
            {!initial && (
                <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm">
                    <option value="">Selecciona una organización</option>
                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            )}
            <div className="grid grid-cols-2 gap-3">
                <select value={commissionBasis} onChange={(e) => setCommissionBasis(e.target.value as any)} className="px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm">
                    <option value="ticket_revenue">% de venta de boletos</option>
                    <option value="platform_fee">% del fee de la plataforma</option>
                </select>
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
            </div>
            <input
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas del contrato (opcional)"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-60">
                    {saving ? "Guardando..." : "Guardar contrato"}
                </button>
            </div>
        </div>
    );
}

function BrokerCard({ broker, organizations, contracts, onChanged }: {
    broker: AuthUser;
    organizations: Organization[];
    contracts: BrokerContract[];
    onChanged: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const contractedOrgIds = new Set(contracts.map((c) => c.organizationId));
    const availableOrgs = organizations.filter((o) => !contractedOrgIds.has(o.id));

    const handleCreate = async (input: { organizationId: string; commissionBasis: BrokerContract['commissionBasis']; commissionPercentage: number; notes: string }) => {
        await dataService.createBrokerContract({ brokerProfileId: broker.id, ...input });
        setAdding(false);
        onChanged();
    };

    const handleUpdate = async (id: string, input: { commissionBasis: BrokerContract['commissionBasis']; commissionPercentage: number; notes: string }) => {
        await dataService.updateBrokerContract(id, input);
        setEditingId(null);
        onChanged();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este contrato? El broker dejará de ver ganancias de esta organización.")) return;
        await dataService.deleteBrokerContract(id);
        onChanged();
    };

    return (
        <div className="border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors text-left">
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                        {broker.avatar || broker.name[0]}
                    </div>
                    <div>
                        <p className="font-bold">{broker.name}</p>
                        <p className="text-xs text-muted-foreground">{broker.email}</p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">{contracts.length} organizaci{contracts.length === 1 ? "ón" : "ones"} bajo contrato</p>
            </button>

            {expanded && (
                <div className="px-6 pb-6 space-y-3 border-t border-border pt-4">
                    {contracts.length === 0 && !adding && (
                        <p className="text-sm text-muted-foreground italic">Este broker todavía no tiene contratos con ninguna organización.</p>
                    )}
                    {contracts.map((c) => editingId === c.id ? (
                        <ContractForm
                            key={c.id}
                            organizations={organizations}
                            initial={c}
                            onCancel={() => setEditingId(null)}
                            onSave={(input) => handleUpdate(c.id, input)}
                        />
                    ) : (
                        <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/20">
                            <div>
                                <p className="text-sm font-bold">{c.organizationName}</p>
                                <p className="text-xs text-muted-foreground">{BASIS_LABEL[c.commissionBasis]} · {c.commissionPercentage}%{c.notes ? ` · ${c.notes}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setEditingId(c.id)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground" title="Editar contrato">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground" title="Eliminar contrato">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {adding ? (
                        <ContractForm organizations={availableOrgs} onCancel={() => setAdding(false)} onSave={handleCreate} />
                    ) : availableOrgs.length > 0 ? (
                        <button onClick={() => setAdding(true)} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                            <Plus className="w-4 h-4" /> Agregar contrato con otra organización
                        </button>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">Ya tiene contrato con todas las organizaciones registradas.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AdminBrokers() {
    const [brokers, setBrokers] = useState<AuthUser[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [contracts, setContracts] = useState<BrokerContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const load = () => {
        Promise.all([
            dataService.getUsers(),
            dataService.getOrganizations(),
            dataService.getAllBrokerContracts(),
        ]).then(([users, orgs, allContracts]) => {
            setBrokers(users.filter((u) => u.role === 'broker'));
            setOrganizations(orgs);
            setContracts(allContracts);
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Handshake className="w-8 h-8 text-primary" /> Brokers
                    </h1>
                    <p className="text-muted-foreground">Cuentas externas que reciben un % de ganancia por organización, sin ver el ingreso real de sus eventos</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Broker
                </button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

            {!loading && brokers.length === 0 && (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <Handshake className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Todavía no hay brokers registrados.</p>
                </div>
            )}

            <div className="space-y-3">
                {brokers.map((broker) => (
                    <BrokerCard
                        key={broker.id}
                        broker={broker}
                        organizations={organizations}
                        contracts={contracts.filter((c) => c.brokerProfileId === broker.id)}
                        onChanged={load}
                    />
                ))}
            </div>

            {showCreateModal && (
                <CreateBrokerModal onClose={() => setShowCreateModal(false)} onCreated={load} />
            )}
        </div>
    );
}
