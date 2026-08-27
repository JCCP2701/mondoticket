import { Link, useLocation } from "react-router";
import {
    LayoutDashboard,
    Calendar,
    FileText,
    Settings,
    LogOut,
    Ticket,
    Megaphone,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import OrgSwitcher from "../shared/OrgSwitcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarTrigger,
} from "../ui/sidebar";
import "../landing/landing-theme.css";

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/organization' },
    { id: 'events', label: 'Mis Eventos', icon: Calendar, path: '/organization/events' },
    { id: 'contract', label: 'Mi Contrato', icon: FileText, path: '/organization/contract' },
    { id: 'promoters', label: 'Promotores', icon: Megaphone, path: '/organization/promoters' },
    { id: 'settings', label: 'Configuración', icon: Settings, path: '/organization/settings' },
];

export default function OrganizationSidebar() {
    const location = useLocation();
    const { logout, user } = useAuth();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border p-3">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
                    <SidebarTrigger className="shrink-0" />
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-white/[0.06]">
                            <Ticket className="w-[18px] h-[18px]" style={{ color: 'var(--mt-gold)' }} />
                        </div>
                        <span className="text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
                            <span style={{ color: 'var(--mt-green-light)' }}>mondo</span>
                            <span className="mt-gradient-gold-text">ticket</span>
                        </span>
                    </div>
                </div>

                <div className="group-data-[collapsible=icon]:hidden">
                    <OrgSwitcher variant="dark" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {MENU_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                                        <Link to={item.path}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-3 gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 shrink-0 bg-sidebar-accent rounded-full flex items-center justify-center font-bold text-sidebar-accent-foreground text-sm">
                        {user?.name?.[0] || 'O'}
                    </div>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold truncate">{user?.name || 'Organizador'}</p>
                        <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    title="Cerrar sesión"
                    className="w-full flex items-center gap-3 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium group-data-[collapsible=icon]:justify-center"
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
                </button>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
