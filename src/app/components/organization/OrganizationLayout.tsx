import { Outlet } from "react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../ui/sidebar";
import OrganizationSidebar from "./OrganizationSidebar";

export default function OrganizationLayout() {
    return (
        <SidebarProvider>
            <OrganizationSidebar />
            <SidebarInset>
                <div className="md:hidden flex items-center gap-2 p-3 border-b border-border sticky top-0 bg-background z-10">
                    <SidebarTrigger />
                    <span className="font-bold">MondoTicket</span>
                </div>
                <div className="p-8 pb-20">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
