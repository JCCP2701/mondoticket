import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Megaphone, UserPlus } from "lucide-react";
import { dataService } from "../../services/dataService";
import { AuthUser, useAuth } from "../../context/AuthContext";
import PromoterTermsPanel from "../shared/PromoterTermsPanel";

export default function OrganizationPromoters() {
    const { activeOrganizationId } = useAuth();
    const [promoters, setPromoters] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [inviteForm, setInviteForm] = useState({ name: "", email: "" });
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [lastInvite, setLastInvite] = useState<{ email: string; temporaryPassword: string } | null>(null);

    const load = () => {
        if (!activeOrganizationId) return;
        setLoading(true);
        dataService.getOrganizationMembers(activeOrganizationId).then((members) => {
            setPromoters(members.filter((m) => m.role === 'promotor'));
            setLoading(false);
        });
    };

    useEffect(() => {
        load();
        setExpandedId(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrganizationId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOrganizationId) return;
        setInviting(true);
        setInviteError("");
        setLastInvite(null);
        try {
            const result = await dataService.inviteStaff(inviteForm.name, inviteForm.email, 'promotor', [activeOrganizationId]);
            setLastInvite(result);
            setInviteForm({ name: "", email: "" });
            load();
        } catch (err: any) {
            setInviteError(err.message || "No se pudo invitar al promotor");
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-foreground">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Promotores</h1>
                <p className="text-muted-foreground mt-1 text-lg">Invita promotores y administra sus metas de venta y comisión</p>
            </div>

            {/* Invitar promotor */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Invitar promotor
                </h2>

                {inviteError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{inviteError}</div>
                )}
                {lastInvite && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
                        Cuenta creada: <strong>{lastInvite.email}</strong> — contraseña temporal: <code className="font-mono bg-white px-2 py-0.5 rounded border border-success/40">{lastInvite.temporaryPassword}</code>
                    </div>
                )}

                <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        required placeholder="Nombre" value={inviteForm.name}
                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                        className="px-4 py-3 rounded-xl border-2 border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                        required type="email" placeholder="Correo" value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        className="px-4 py-3 rounded-xl border-2 border-border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button type="submit" disabled={inviting} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:hover:scale-100">
                        {inviting ? "Invitando..." : "Invitar promotor"}
                    </button>
                </form>
            </div>

            {/* Lista de promotores */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Mis promotores
                </h2>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : promoters.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Todavía no tienes promotores. Invita al primero arriba.</p>
                ) : (
                    <div className="space-y-3">
                        {promoters.map((p) => {
                            const isExpanded = expandedId === p.id;
                            return (
                                <div key={p.id} className="rounded-xl border border-border overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                        className="w-full flex items-center justify-between px-5 py-4 bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-sm">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">{p.email}</p>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                    {isExpanded && (
                                        <div className="p-6 border-t border-border">
                                            <PromoterTermsPanel
                                                promoterProfileId={p.id}
                                                promoterName={p.name}
                                                organizationId={activeOrganizationId ?? ""}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
