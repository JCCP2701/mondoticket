import { useState, useEffect } from "react";
import { Building2, Search, Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight, Users } from "lucide-react";
import { Link } from "react-router";
import { dataService, Organization } from "../../services/dataService";

export default function AdminOrganizations() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        setOrgs(dataService.getOrganizations());
    }, []);

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
                        <span className="text-xs text-green-600 font-bold mb-1 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            +12%
                        </span>
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
                        <span className="text-3xl font-bold text-foreground">42</span>
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
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
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
                                        <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary ml-2">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
