import { useState, useEffect } from "react";
import { Search, Filter, Shield, User, Mail, MoreVertical } from "lucide-react";
import { dataService } from "../../services/dataService";
import { AuthUser, UserRole } from "../../context/AuthContext";

export default function AdminUserManagement() {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

    useEffect(() => {
        dataService.getUsers().then(setUsers);
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
                <p className="text-muted-foreground">Administra clientes y personal de organizaciones</p>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                {/* Filters Header */}
                <div className="p-6 border-b border-border bg-secondary/20 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-background rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-xl">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="bg-transparent text-sm font-medium outline-none cursor-pointer"
                            >
                                <option value="all">Todos los Roles</option>
                                <option value="user">Clientes (Normal)</option>
                                <option value="organization">Organizaciones</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/10">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rol</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Organización</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-secondary/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                                                {user.avatar || user.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{user.name}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="w-3 h-3" />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.role === 'superadmin' ? "bg-red-100 text-red-700" :
                                                user.role === 'organization' ? "bg-violet-100 text-violet-700" :
                                                    "bg-blue-100 text-blue-700"
                                            }`}>
                                            {user.role === 'superadmin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {user.organizations.length > 0
                                            ? user.organizations.map(o => o.name).join(', ')
                                            : <span className="italic">N/A</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-sm font-medium">Activo</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                                        <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        No se encontraron usuarios que coincidan con los criterios.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
