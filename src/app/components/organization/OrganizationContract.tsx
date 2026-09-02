import { FileText, CheckCircle, ShieldCheck, Download, Calendar, DollarSign, Wallet, Ticket, Gift, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { dataService, Organization } from "../../services/dataService";
import { useAuth } from "../../context/AuthContext";
import { generateContractPdf } from "../../lib/pdf";

function courtesyResolved(org: Organization): { value: string; caption: string } {
    if (org.courtesyMode === 'percentage') {
        if (org.courtesyPercentage == null) {
            return { value: "Sin límite", caption: "Modo porcentaje sin valor configurado" };
        }
        return {
            value: `${org.courtesyPercentage}%`,
            caption: "Del aforo de cada evento (varía según la capacidad de cada uno — ve el detalle exacto en tu Panel de Control)",
        };
    }
    return {
        value: org.courtesyTicketsPerEvent != null ? String(org.courtesyTicketsPerEvent) : "Sin límite",
        caption: "Boletos gratuitos permitidos por evento",
    };
}

function formatHoldDuration(minutes: number): string {
    if (minutes % 1440 === 0) {
        const days = minutes / 1440;
        return `${days} ${days === 1 ? 'día' : 'días'}`;
    }
    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return `${minutes} minutos`;
}

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

    const courtesy = courtesyResolved(org);

    const handleDownloadPdf = () => {
        generateContractPdf({
            orgName: org.name,
            legalName: org.legalName,
            rfc: org.rfc,
            address: org.address,
            contactName: org.contactName,
            createdAtLabel: new Date(org.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
            feePercentage: String(org.feePercentage),
            paymentTerms: String(org.paymentTerms),
            taquillaFeeLabel: `${org.taquillaFeePercentage ?? org.feePercentage}%`,
            taquillaFeeHint: org.taquillaFeePercentage != null ? "Fee específico para ventas en taquilla" : "Usa el mismo fee que la venta digital",
            maxEventsPerMonthLabel: org.maxEventsPerMonth != null ? String(org.maxEventsPerMonth) : "Sin límite",
            courtesyTicketsLabel: courtesy.value,
            courtesyTicketsHint: courtesy.caption,
            holdDurationLabel: formatHoldDuration(org.reservationHoldMinutes),
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center text-foreground">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mi Contrato y Convenio</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Términos comerciales y acuerdos de servicio con MondoTicket</p>
                </div>
                <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20">
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
                    <p className="text-xs text-muted-foreground mt-2">Alta: {new Date(org.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
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

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Fee en Taquilla</span>
                    </div>
                    <span className="text-3xl font-bold text-primary">{org.taquillaFeePercentage ?? org.feePercentage}%</span>
                    <p className="text-xs text-muted-foreground mt-2">
                        {org.taquillaFeePercentage != null ? "Fee específico para ventas en taquilla" : "Usa el mismo fee que la venta digital"}
                    </p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Eventos por Mes</span>
                    </div>
                    <span className="text-3xl font-bold">{org.maxEventsPerMonth ?? "Sin límite"}</span>
                    <p className="text-xs text-muted-foreground mt-2">Máximo de eventos nuevos por mes calendario</p>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                            <Gift className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Cortesías por Evento</span>
                    </div>
                    <span className="text-3xl font-bold">{courtesy.value}</span>
                    <p className="text-xs text-muted-foreground mt-2">{courtesy.caption}</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">Tiempo de Reserva antes de Liberar Boletos</span>
                </div>
                <span className="text-3xl font-bold text-primary">{formatHoldDuration(org.reservationHoldMinutes)}</span>
                <p className="text-xs text-muted-foreground mt-2">
                    Si un comprador no completa el pago en este tiempo, el boleto vuelve a estar disponible para venta al público. No aplica a cortesías ni ventas de taquilla.
                </p>
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
