import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import LandingPage from "./components/landing/LandingPage";
import LoginPage from "./components/auth/LoginPage";
import MFAPage from "./components/auth/MFAPage";
import RegisterPage from "./components/auth/RegisterPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SuperAdminDashboard from "./components/admin/SuperAdminDashboard";
import CreateOrganization from "./components/admin/CreateOrganization";
import OrganizationDashboard from "./components/organization/OrganizationDashboard";
import EventDetail from "./components/organization/EventDetail";
import CreateEvent from "./components/organization/CreateEvent";
import UserCheckout from "./components/user/UserCheckout";
import UserTicket from "./components/user/UserTicket";
import UserWallet from "./components/user/UserWallet";
import AdminLayout from "./components/admin/AdminLayout";
import AdminUserManagement from "./components/admin/AdminUserManagement";
import AdminOrganizations from "./components/admin/AdminOrganizations";
import AdminFinances from "./components/admin/AdminFinances";
import AdminSettings from "./components/admin/AdminSettings";
import OrganizationLayout from "./components/organization/OrganizationLayout";
import VenueDesigner from "./components/organization/VenueDesigner";
import OrganizationContract from "./components/organization/OrganizationContract";
import OrganizationSettings from "./components/organization/OrganizationSettings";
import OrganizationEvents from "./components/organization/OrganizationEvents";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        children: [
            // Public routes
            { index: true, Component: LandingPage },
            { path: "login", Component: LoginPage },
            { path: "mfa", Component: MFAPage },
            { path: "register", Component: RegisterPage },
            { path: "checkout/:eventId", Component: UserCheckout },
            { path: "ticket/:ticketId", Component: UserTicket },

            // Super Admin routes (protected)
            {
                path: "admin",
                element: (
                    <ProtectedRoute requiredRole="superadmin">
                        <AdminLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { index: true, Component: SuperAdminDashboard },
                    { path: "organizations", Component: AdminOrganizations },
                    { path: "users", Component: AdminUserManagement },
                    { path: "finances", Component: AdminFinances },
                    { path: "settings", Component: AdminSettings },
                    { path: "create-organization", Component: CreateOrganization },
                ]
            },

            // Organization routes (protected)
            {
                path: "organization",
                element: (
                    <ProtectedRoute requiredRole="organization">
                        <OrganizationLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { index: true, Component: OrganizationDashboard },
                    { path: "events", Component: OrganizationEvents },
                    { path: "create-event", Component: CreateEvent },
                    { path: "venue-designer", Component: VenueDesigner },
                    { path: "contract", Component: OrganizationContract },
                    { path: "settings", Component: OrganizationSettings },
                    { path: "event/:eventId", Component: EventDetail },
                ]
            },

            // User routes (protected)
            {
                path: "wallet",
                element: (
                    <ProtectedRoute requiredRole="user">
                        <UserWallet />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);
