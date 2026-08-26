import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Search, Filter, Shield, User, Mail, Settings2, Plus, X, Building2 } from "lucide-react";
import { dataService, Organization } from "../../services/dataService";
import { AuthUser, UserRole } from "../../context/AuthContext";

function CreateUserModal({ organizations, onClose, onCreated }: {
    organizations: Organization[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'organization' | 'taquilla' | 'validador' | 'broker'>('organization');
    const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null);

    const toggleOrg = (id: string) => {
        setSelectedOrgIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // A broker's relationship to an organization is a commercial contract
        // (set up afterward from "Brokers"), not staff membership, so it
        // doesn't need an organization picked at account-creation time.
        if (!name.trim() || !email.trim() || (role !== 'broker' && selectedOrgIds.length === 0)) {
            setError("Nombre, correo y al menos una organización son obligatorios.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const res = await dataService.inviteStaff(name.trim(), email.trim(), role, role === 'broker' ? [] : selectedOrgIds);
            setResult(res);
            onCreated();
        } catch (err: any) {
            setError(err.message || "No se pudo crear el usuario");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-md w-full space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Nuevo Usuario</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {result ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm">
                            Cuenta creada para <strong>{result.email}</strong>.
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Contraseña temporal</p>
                            <p className="font-mono text-sm">{result.temporaryPassword}</p>
                        </div>
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
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-2 block">Rol</label>
                            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background outline-none">
                                <option value="organization">Organización</option>
                                <option value="taquilla">Taquilla</option>
                                <option value="validador">Validador (puerta)</option>
                                <option value="broker">Broker</option>
                            </select>
                        </div>
                        {role === 'broker' ? (
                            <p className="text-xs text-muted-foreground italic">
                                Un broker no se asigna a organizaciones aquí — una vez creada la cuenta, configura sus contratos por organización desde "Brokers".
                            </p>
                        ) : (
                            <div>
                                <label className="text-sm font-bold text-muted-foreground mb-2 block">Organización(es)</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-border rounded-xl p-3">
                                    {organizations.length === 0 && <p className="text-xs text-muted-foreground">No hay organizaciones registradas todavía.</p>}
                                    {organizations.map((org) => (
                                        <label key={org.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={selectedOrgIds.includes(org.id)} onChange={() => toggleOrg(org.id)} />
                                            {org.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-60">
                            {submitting ? "Creando..." : "Crear Usuario"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function ManageUserModal({ user, organizations, onClose, onChanged }: {
    user: AuthUser;
    organizations: Organization[];
    onClose: () => void;
    onChanged: () => void;
}) {
    const [orgs, setOrgs] = useState(user.organizations);
    const [addOrgId, setAddOrgId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const manageable = user.role === 'organization' || user.role === 'taquilla' || user.role === 'validador';
    const availableToAdd = organizations.filter((o) => !orgs.some((uo) => uo.id === o.id));

    const handleRemove = async (orgId: string) => {
        setBusy(true);
        setError("");
        try {
            await dataService.removeUserFromOrganization(user.id, orgId);
            setOrgs((prev) => prev.filter((o) => o.id !== orgId));
            onChanged();
        } catch (err: any) {
            setError(err.message || "No se pudo quitar de la organización");
        } finally {
            setBusy(false);
        }
    };

    const handleAdd = async () => {
        if (!addOrgId) return;
        setBusy(true);
        setError("");
        try {
            await dataService.addExistingUserToOrganization(user.id, addOrgId);
            const added = organizations.find((o) => o.id === addOrgId);
            if (added) setOrgs((prev) => [...prev, { id: added.id, name: added.name }]);
            setAddOrgId("");
            onChanged();
        } catch (err: any) {
            setError(err.message || "No se pudo agregar a la organización");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border shadow-xl p-8 max-w-md w-full space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">{user.name}</h3>
                        <p className="text-xs text-muted-foreground">{user.email} · {user.role.toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {!manageable ? (
                    <p className="text-sm text-muted-foreground">
                        Las cuentas con rol <strong>{user.role}</strong> no pertenecen a organizaciones.
                    </p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Organizaciones actuales
                            </p>
                            {orgs.length === 0 && <p className="text-xs italic text-muted-foreground">Sin organizaciones asignadas.</p>}
                            <div className="space-y-2">
                                {orgs.map((o) => (
                                    <div key={o.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-secondary/20">
                                        <span className="text-sm font-medium">{o.name}</span>
                                        <button
                                            onClick={() => handleRemove(o.id)}
                                            disabled={busy}
                                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-muted-foreground disabled:opacity-40"
                                            title="Quitar de esta organización"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {availableToAdd.length > 0 && (
                            <div>
                                <p className="text-sm font-bold text-muted-foreground mb-2">Agregar a otra organización</p>
                                <div className="flex gap-2">
                                    <select value={addOrgId} onChange={(e) => setAddOrgId(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl border-2 border-border bg-background outline-none text-sm">
                                        <option value="">Selecciona una organización</option>
                                        {availableToAdd.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                    <button onClick={handleAdd} disabled={busy || !addOrgId} className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold disabled:opacity-40">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AdminUserManagement() {
    const [searchParams] = useSearchParams();
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const roleParam = searchParams.get('role');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>(
        roleParam === 'user' || roleParam === 'organization' || roleParam === 'taquilla' || roleParam === 'validador' || roleParam === 'broker' || roleParam === 'superadmin' ? roleParam : 'all'
    );
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [managingUser, setManagingUser] = useState<AuthUser | null>(null);

    const load = () => {
        dataService.getUsers().then(setUsers);
        dataService.getOrganizations().then(setOrganizations);
    };

    useEffect(() => { load(); }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-muted-foreground">Administra clientes y personal de organizaciones</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Usuario
                </button>
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
                                <option value="taquilla">Taquilla</option>
                                <option value="validador">Validador</option>
                                <option value="broker">Broker</option>
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
                                                user.role === 'organization' ? "bg-primary/10 text-primary" :
                                                    user.role === 'validador' ? "bg-amber-100 text-amber-700" :
                                                        user.role === 'broker' ? "bg-teal-100 text-teal-700" :
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
                                            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                            <span className="text-sm font-medium">Activo</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setManagingUser(user)}
                                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground inline-flex items-center gap-2"
                                            title="Gestionar organizaciones"
                                        >
                                            <Settings2 className="w-5 h-5" />
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

            {showCreateModal && (
                <CreateUserModal
                    organizations={organizations}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={load}
                />
            )}

            {managingUser && (
                <ManageUserModal
                    user={managingUser}
                    organizations={organizations}
                    onClose={() => { setManagingUser(null); load(); }}
                    onChanged={load}
                />
            )}
        </div>
    );
}
