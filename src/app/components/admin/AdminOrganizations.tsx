import { useState, useEffect } from "react";
import { Building2, Search, Plus, Users, X, UserPlus, Mail, FileEdit, Pencil } from "lucide-react";
import { Link } from "react-router";
import { dataService, Organization } from "../../services/dataService";
import { AuthUser } from "../../context/AuthContext";

export default function AdminOrganizations() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [activeEventCount, setActiveEventCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [membersOrg, setMembersOrg] = useState<Organization | null>(null);
    const [contractOrg, setContractOrg] = useState<Organization | null>(null);
    const [detailsOrg, setDetailsOrg] = useState<Organization | null>(null);

    const load = () => {
        dataService.getOrganizations().then(setOrgs);
        dataService.getEvents().then((evs) =>
            setActiveEventCount(evs.filter((e) => e.status === 'upcoming' || e.status === 'ongoing').length)
        );
    };

    useEffect(() => { load(); }, []);

    const filteredOrgs = orgs.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.legalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Organizaciones</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Control de partners y convenios comerciales</p>
                </div>
                <Link
                    to="/admin/create-organization"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Organización
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Organizaciones</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-foreground">{orgs.length}</span>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Fee Promedio</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-foreground">
                            {(orgs.reduce((acc, org) => acc + org.feePercentage, 0) / (orgs.length || 1)).toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Eventos Activos</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-foreground">{activeEventCount}</span>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-secondary/10 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, RFC o representante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/5 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Convenio</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredOrgs.map((org) => (
                                <tr key={org.id} className="hover:bg-secondary/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                <Building2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors">{org.name}</p>
                                                <p className="text-xs text-muted-foreground">{org.legalName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                                {org.feePercentage}% Fee
                                            </span>
                                            <p className="text-xs text-muted-foreground">Pago: {org.paymentTerms} días</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="font-medium">{org.contactName}</p>
                                            <p className="text-xs text-muted-foreground">{org.contactEmail}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setDetailsOrg(org)}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-lg transition-colors text-primary font-bold text-sm"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Detalle
                                            </button>
                                            <button
                                                onClick={() => setContractOrg(org)}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-lg transition-colors text-primary font-bold text-sm"
                                            >
                                                <FileEdit className="w-4 h-4" />
                                                Convenio
                                            </button>
                                            <button
                                                onClick={() => setMembersOrg(org)}
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-lg transition-colors text-primary font-bold text-sm"
                                            >
                                                <Users className="w-4 h-4" />
                                                Miembros
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {membersOrg && (
                <MembersModal org={membersOrg} onClose={() => setMembersOrg(null)} />
            )}

            {contractOrg && (
                <ContractModal org={contractOrg} onClose={() => setContractOrg(null)} onSaved={load} />
            )}

            {detailsOrg && (
                <DetailsModal org={detailsOrg} onClose={() => setDetailsOrg(null)} onSaved={load} />
            )}
        </div>
    );
}

function DetailsModal({ org, onClose, onSaved }: { org: Organization; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState(org.name);
    const [legalName, setLegalName] = useState(org.legalName);
    const [rfc, setRfc] = useState(org.rfc);
    const [address, setAddress] = useState(org.address);
    const [contactName, setContactName] = useState(org.contactName);
    const [contactEmail, setContactEmail] = useState(org.contactEmail);
    const [contactPhone, setContactPhone] = useState(org.contactPhone);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            await dataService.updateOrganizationDetails(org.id, {
                name: name.trim(),
                legalName: legalName.trim(),
                rfc: rfc.trim(),
                address: address.trim(),
                contactName: contactName.trim(),
                contactEmail: contactEmail.trim(),
                contactPhone: contactPhone.trim(),
            });
            setSaved(true);
            onSaved();
        } catch (err: any) {
            setError(err.message || "No se pudo guardar la organización");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Detalle de {org.name}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {saved && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
                        Organización actualizada correctamente.
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Nombre Comercial</label>
                        <input
                            required value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Razón Social</label>
                        <input
                            required value={legalName} onChange={(e) => setLegalName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">RFC</label>
                            <input
                                required value={rfc} onChange={(e) => setRfc(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Teléfono de Contacto</label>
                            <input
                                required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Dirección Fiscal</label>
                        <input
                            required value={address} onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Representante Legal</label>
                        <input
                            required value={contactName} onChange={(e) => setContactName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Correo de Contacto</label>
                        <input
                            required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                    <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60">
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </form>
            </div>
        </div>
    );
}

const HOLD_UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440 } as const;
type HoldUnit = keyof typeof HOLD_UNIT_MINUTES;
const HOLD_MIN_MINUTES = 5;
const HOLD_MAX_MINUTES = 129600; // 90 days

function minutesToValueUnit(mins: number): { value: string; unit: HoldUnit } {
    if (mins % 1440 === 0) return { value: String(mins / 1440), unit: 'days' };
    if (mins % 60 === 0) return { value: String(mins / 60), unit: 'hours' };
    return { value: String(mins), unit: 'minutes' };
}

function ContractModal({ org, onClose, onSaved }: { org: Organization; onClose: () => void; onSaved: () => void }) {
    const [feePercentage, setFeePercentage] = useState(String(org.feePercentage));
    const [paymentTerms, setPaymentTerms] = useState(String(org.paymentTerms));
    const [contractNotes, setContractNotes] = useState(org.contractNotes ?? "");
    const [maxEventsPerMonth, setMaxEventsPerMonth] = useState(org.maxEventsPerMonth != null ? String(org.maxEventsPerMonth) : "");
    const [courtesyTicketsPerEvent, setCourtesyTicketsPerEvent] = useState(org.courtesyTicketsPerEvent != null ? String(org.courtesyTicketsPerEvent) : "");
    const [taquillaFeePercentage, setTaquillaFeePercentage] = useState(org.taquillaFeePercentage != null ? String(org.taquillaFeePercentage) : "");
    const initialHold = minutesToValueUnit(org.reservationHoldMinutes);
    const [holdValue, setHoldValue] = useState(initialHold.value);
    const [holdUnit, setHoldUnit] = useState<HoldUnit>(initialHold.unit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const reservationHoldMinutes = Math.round(parseFloat(holdValue) * HOLD_UNIT_MINUTES[holdUnit]);
        if (!Number.isFinite(reservationHoldMinutes) || reservationHoldMinutes < HOLD_MIN_MINUTES || reservationHoldMinutes > HOLD_MAX_MINUTES) {
            setError("El tiempo de reserva debe ser entre 5 minutos y 90 días.");
            return;
        }

        setSaving(true);
        try {
            await dataService.updateOrganizationContract(org.id, {
                feePercentage: parseFloat(feePercentage),
                paymentTerms: parseInt(paymentTerms, 10),
                contractNotes: contractNotes.trim() || undefined,
                maxEventsPerMonth: maxEventsPerMonth.trim() ? parseInt(maxEventsPerMonth, 10) : null,
                courtesyTicketsPerEvent: courtesyTicketsPerEvent.trim() ? parseInt(courtesyTicketsPerEvent, 10) : null,
                taquillaFeePercentage: taquillaFeePercentage.trim() ? parseFloat(taquillaFeePercentage) : null,
                reservationHoldMinutes,
            });
            setSaved(true);
            onSaved();
        } catch (err: any) {
            setError(err.message || "No se pudo guardar el convenio");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-md w-full space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><FileEdit className="w-5 h-5 text-primary" /> Convenio de {org.name}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {saved && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
                        Convenio actualizado correctamente.
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Fee por Ticket (%)</label>
                        <input
                            type="number" min="0" max="100" step="0.5" required
                            value={feePercentage} onChange={(e) => setFeePercentage(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Plazo de Pago (días)</label>
                        <select
                            value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                        >
                            <option value="7">7 días</option>
                            <option value="15">15 días</option>
                            <option value="30">30 días</option>
                            <option value="45">45 días</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Fee para Ventas en Taquilla (%)</label>
                        <input
                            type="number" min="0" max="100" step="0.5"
                            value={taquillaFeePercentage} onChange={(e) => setTaquillaFeePercentage(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                            placeholder={`Vacío = usa el fee general (${feePercentage}%)`}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Si se deja vacío, se aplica el mismo fee que a la venta digital.</p>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Tiempo de Reserva antes de Liberar Boletos</label>
                        <div className="flex gap-3">
                            <input
                                type="number" min="1" step="1" required
                                value={holdValue} onChange={(e) => setHoldValue(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                            />
                            <select
                                value={holdUnit} onChange={(e) => setHoldUnit(e.target.value as HoldUnit)}
                                className="px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                            >
                                <option value="minutes">Minutos</option>
                                <option value="hours">Horas</option>
                                <option value="days">Días</option>
                            </select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Si el comprador no completa el pago en este tiempo, el boleto vuelve a estar disponible. No aplica a cortesías ni ventas de taquilla. Entre 5 minutos y 90 días.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Eventos por Mes</label>
                            <input
                                type="number" min="0"
                                value={maxEventsPerMonth} onChange={(e) => setMaxEventsPerMonth(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                                placeholder="Sin límite"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Cortesías por Evento</label>
                            <input
                                type="number" min="0"
                                value={courtesyTicketsPerEvent} onChange={(e) => setCourtesyTicketsPerEvent(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none"
                                placeholder="Sin límite"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-2 block">Notas del Convenio</label>
                        <textarea
                            value={contractNotes} onChange={(e) => setContractNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none resize-none"
                            placeholder="Condiciones especiales, descuentos, cláusulas adicionales..."
                        />
                    </div>
                    {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                    <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60">
                        {saving ? "Guardando..." : "Guardar Convenio"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function MembersModal({ org, onClose }: { org: Organization; onClose: () => void }) {
    const [members, setMembers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastInvite, setLastInvite] = useState<{ email: string; temporaryPassword: string } | null>(null);

    const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "taquilla" as "organization" | "taquilla" | "validador" | "promotor" });
    const [inviting, setInviting] = useState(false);

    const [existingEmail, setExistingEmail] = useState("");
    const [addingExisting, setAddingExisting] = useState(false);

    const load = async () => {
        setLoading(true);
        setMembers(await dataService.getOrganizationMembers(org.id));
        setLoading(false);
    };

    useEffect(() => { load(); }, [org.id]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setError("");
        setLastInvite(null);
        try {
            const result = await dataService.inviteStaff(inviteForm.name, inviteForm.email, inviteForm.role, [org.id]);
            setLastInvite(result);
            setInviteForm({ name: "", email: "", role: "taquilla" });
            await load();
        } catch (err: any) {
            setError(err.message || "No se pudo invitar al usuario");
        } finally {
            setInviting(false);
        }
    };

    const handleAddExisting = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingExisting(true);
        setError("");
        try {
            const profile = await dataService.findProfileByEmail(existingEmail);
            if (!profile) throw new Error("No existe ninguna cuenta con ese correo");
            if (profile.role !== 'organization' && profile.role !== 'taquilla' && profile.role !== 'validador' && profile.role !== 'promotor') {
                throw new Error("Solo se pueden agregar cuentas con rol organización, taquilla, validador o promotor");
            }
            await dataService.addExistingUserToOrganization(profile.id, org.id);
            setExistingEmail("");
            await load();
        } catch (err: any) {
            setError(err.message || "No se pudo agregar el usuario");
        } finally {
            setAddingExisting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Miembros de {org.name}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                {lastInvite && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
                        Cuenta creada: <strong>{lastInvite.email}</strong> — contraseña temporal: <code className="font-mono bg-white px-2 py-0.5 rounded border border-success/40">{lastInvite.temporaryPassword}</code>
                    </div>
                )}

                <div className="space-y-2">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Cargando miembros...</p>
                    ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin miembros todavía.</p>
                    ) : (
                        members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                                <div>
                                    <p className="font-bold text-sm">{m.name}</p>
                                    <p className="text-xs text-muted-foreground">{m.email}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${m.role === 'organization' ? 'bg-primary/10 text-primary' : m.role === 'validador' ? 'bg-amber-100 text-amber-700' : m.role === 'promotor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {m.role}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                    <h4 className="font-bold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Invitar nuevo usuario</h4>
                    <form onSubmit={handleInvite} className="grid grid-cols-2 gap-3">
                        <input
                            required placeholder="Nombre" value={inviteForm.name}
                            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                            className="px-3 py-2 rounded-lg border-2 border-border bg-background outline-none col-span-1"
                        />
                        <input
                            required type="email" placeholder="Correo" value={inviteForm.email}
                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                            className="px-3 py-2 rounded-lg border-2 border-border bg-background outline-none col-span-1"
                        />
                        <select
                            value={inviteForm.role}
                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "organization" | "taquilla" | "validador" | "promotor" })}
                            className="px-3 py-2 rounded-lg border-2 border-border bg-background outline-none col-span-1"
                        >
                            <option value="taquilla">Taquilla</option>
                            <option value="validador">Validador (puerta)</option>
                            <option value="organization">Organización</option>
                            <option value="promotor">Promotor</option>
                        </select>
                        <button type="submit" disabled={inviting} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-60 col-span-1">
                            {inviting ? "Invitando..." : "Invitar"}
                        </button>
                    </form>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
                    <h4 className="font-bold text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Agregar usuario existente</h4>
                    <form onSubmit={handleAddExisting} className="flex gap-3">
                        <input
                            required type="email" placeholder="Correo de la cuenta existente" value={existingEmail}
                            onChange={(e) => setExistingEmail(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background outline-none"
                        />
                        <button type="submit" disabled={addingExisting} className="px-4 py-2 bg-secondary rounded-lg font-bold text-sm disabled:opacity-60">
                            {addingExisting ? "Agregando..." : "Agregar"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
