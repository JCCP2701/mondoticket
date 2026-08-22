import { Link, useLocation } from "react-router";
import {
    LayoutDashboard,
    Building2,
    Users,
    Wallet,
    Settings,
    LogOut,
    ChevronRight,
    Handshake
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'organizations', label: 'Organizaciones', icon: Building2, path: '/admin/organizations' },
    { id: 'users', label: 'Usuarios', icon: Users, path: '/admin/users' },
    { id: 'brokers', label: 'Brokers', icon: Handshake, path: '/admin/brokers' },
    { id: 'finances', label: 'Finanzas', icon: Wallet, path: '/admin/finances' },
    { id: 'settings', label: 'Configuración', icon: Settings, path: '/admin/settings' },
];

export default function AdminSidebar() {
    const location = useLocation();
    const { logout, user } = useAuth();

    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                        TB
                    </div>
                    <span className="font-bold text-xl tracking-tight">MondoTicket</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all group ${isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "group-hover:text-primary"}`} />
                                <span className="font-medium">{item.label}</span>
                            </div>
                            {isActive && <ChevronRight className="w-4 h-4" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border space-y-4">
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-primary">
                        {user?.avatar || 'AD'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user?.name || 'Administrador'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
