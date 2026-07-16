import { FileText, CheckCircle, ShieldCheck, Download, Calendar, DollarSign, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { dataService, Organization } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";

export default function OrganizationContract() {
    const { activeOrganizationId } = useAuth();
    const [org, setOrg] = useState<Organization | null>(null);

    useEffect(() => {
        if (!activeOrganizationId) { setOrg(null); return; }
        dataService.getOrganizations().then((allOrgs) => {
            setOrg(allOrgs.find(o => o.id === activeOrganizationId) ?? null);
        });
    }, [activeOrganizationId]);

    if (!org) return <div>Cargando contrato...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
            <div className="flex justify-between items-center text-foreground">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mi Contrato y Convenio</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Términos comerciales y acuerdos de servicio con TicketBlessing</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20">
                    <Download className="w-5 h-5" />
                    Descargar PDF
                </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Estado del Contrato</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-2xl font-bold">Vigente</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Última renovación: 12 Oct 2025</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-100 rounded-lg text-violet-700">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Comisión (Fee)</span>
                    </div>
                    <span className="text-3xl font-bold text-primary">{org.feePercentage}%</span>
                    <p className="text-xs text-muted-foreground mt-2">Sobre el valor bruto de cada ticket emitido</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Plazo de Pago</span>
                    </div>
                    <span className="text-3xl font-bold">{org.paymentTerms} días</span>
                    <p className="text-xs text-muted-foreground mt-2">Días naturales posteriores al evento</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-secondary/10">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                        <FileText className="w-5 h-5 text-primary" />
                        Detalles del Partner
                    </h3>
                </div>
                <div className="p-8 grid md:grid-cols-2 gap-12 text-foreground">
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Nombre Comercial</label>
                            <p className="text-lg font-medium">{org.name}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Razón Social</label>
                            <p className="text-lg font-medium">{org.legalName}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">RFC</label>
                            <p className="text-lg font-medium font-mono">{org.rfc}</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Representante Legal</label>
                            <p className="text-lg font-medium">{org.contactName}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Dirección Fiscal</label>
                            <p className="text-sm leading-relaxed">{org.address}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 flex gap-4 items-start">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h4 className="font-bold text-primary">Próximos Pagos de Liquidación</h4>
                    <p className="text-sm text-foreground/80 mt-1">Recuerda que las ganancias (Revenue - Fees) se depositarán en tu cuenta CLABE registrada dentro del plazo de <strong>{org.paymentTerms} días</strong> naturales posteriores a la finalización de cada evento.</p>
                </div>
            </div>
        </div>
    );
}
