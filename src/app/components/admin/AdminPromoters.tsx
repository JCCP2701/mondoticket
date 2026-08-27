import { useEffect, useState } from "react";
import { Megaphone, ChevronDown, ChevronRight } from "lucide-react";
import { dataService } from "../../services/dataService";
import { AuthUser } from "../../context/AuthContext";
import PromoterTermsPanel from "../shared/PromoterTermsPanel";

function PromoterCard({ promoter }: { promoter: AuthUser }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors text-left">
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                        {promoter.avatar || promoter.name[0]}
                    </div>
                    <div>
                        <p className="font-bold">{promoter.name}</p>
                        <p className="text-xs text-muted-foreground">{promoter.email}</p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    {promoter.organizations.length} organizaci{promoter.organizations.length === 1 ? "ón" : "ones"}
                </p>
            </button>

            {expanded && (
                <div className="px-6 pb-6 space-y-6 border-t border-border pt-4">
                    {promoter.organizations.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Este promotor todavía no pertenece a ninguna organización.</p>
                    ) : (
                        promoter.organizations.map((org, idx) => (
                            <div key={org.id} className={idx > 0 ? "pt-6 border-t border-border" : ""}>
                                <PromoterTermsPanel
                                    promoterProfileId={promoter.id}
                                    promoterName={promoter.name}
                                    organizationId={org.id}
                                    organizationName={org.name}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default function AdminPromoters() {
    const [promoters, setPromoters] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        dataService.getUsers().then((users) => {
            setPromoters(users.filter((u) => u.role === 'promotor'));
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Megaphone className="w-8 h-8 text-primary" /> Promotores
                </h1>
                <p className="text-muted-foreground">Metas de venta y comisión por promotor — también administrable desde cada organización</p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

            {!loading && promoters.length === 0 && (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Todavía no hay promotores registrados.</p>
                </div>
            )}

            <div className="space-y-3">
                {promoters.map((promoter) => (
                    <PromoterCard key={promoter.id} promoter={promoter} />
                ))}
            </div>
        </div>
    );
}
