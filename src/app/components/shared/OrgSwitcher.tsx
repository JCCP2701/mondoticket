import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Only renders when the profile belongs to more than one organization —
// the common case (exactly one org) stays exactly as simple as before.
// `variant="dark"` is for placement on a black surface (e.g. the Taquilla
// header or a sidebar) — the default stays the original light look.
export default function OrgSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    const { user, activeOrganizationId, setActiveOrganizationId } = useAuth();

    if (!user || user.organizations.length <= 1) return null;

    const isDark = variant === 'dark';

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-white/5 border-sidebar-border' : 'bg-secondary/50 border-border'}`}>
            <Building2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`} />
            <select
                value={activeOrganizationId ?? ''}
                onChange={(e) => setActiveOrganizationId(e.target.value)}
                className={`bg-transparent text-sm font-bold outline-none cursor-pointer ${isDark ? 'text-sidebar-foreground' : ''}`}
            >
                {user.organizations.map((org) => (
                    <option key={org.id} value={org.id} className="text-black">{org.name}</option>
                ))}
            </select>
        </div>
    );
}
