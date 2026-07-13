import { Outlet } from "react-router";
import OrganizationSidebar from "./OrganizationSidebar";

export default function OrganizationLayout() {
    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar - Fixed */}
            <OrganizationSidebar />

            {/* Main Content Area - Scrollable */}
            <main className="flex-1 h-screen overflow-y-auto relative">
                <div className="p-8 pb-20">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
