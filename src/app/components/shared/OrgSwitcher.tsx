import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Only renders when the profile belongs to more than one organization —
// the common case (exactly one org) stays exactly as simple as before.
export default function OrgSwitcher() {
    const { user, activeOrganizationId, setActiveOrganizationId } = useAuth();

    if (!user || user.organizations.length <= 1) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-xl border border-border">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
                value={activeOrganizationId ?? ''}
                onChange={(e) => setActiveOrganizationId(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer"
            >
                {user.organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                ))}
            </select>
        </div>
    );
}
