import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import LandingPage from "./components/landing/LandingPage";
import AllEventsPage from "./components/landing/AllEventsPage";
import PrivacyPolicy from "./components/landing/PrivacyPolicy";
import TermsAndConditions from "./components/landing/TermsAndConditions";
import AboutPage from "./components/landing/AboutPage";
import BlogPage from "./components/landing/BlogPage";
import PressPage from "./components/landing/PressPage";
import CareersPage from "./components/landing/CareersPage";
import HelpCenterPage from "./components/landing/HelpCenterPage";
import StatusPage from "./components/landing/StatusPage";
import SecurityPage from "./components/landing/SecurityPage";
import IntegrationsPage from "./components/landing/IntegrationsPage";
import ApiDocsPage from "./components/landing/ApiDocsPage";
import CookiesPolicyPage from "./components/landing/CookiesPolicyPage";
import DataRightsPage from "./components/landing/DataRightsPage";
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
import AdminBrokers from "./components/admin/AdminBrokers";
import BrokerDashboard from "./components/broker/BrokerDashboard";
import OrganizationLayout from "./components/organization/OrganizationLayout";
import VenueDesigner from "./components/organization/VenueDesigner";
import OrganizationContract from "./components/organization/OrganizationContract";
import OrganizationSettings from "./components/organization/OrganizationSettings";
import OrganizationEvents from "./components/organization/OrganizationEvents";
import TaquillaDashboard from "./components/taquilla/TaquillaDashboard";
import ValidadorDashboard from "./components/validador/ValidadorDashboard";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        children: [
            // Public routes
            { index: true, Component: LandingPage },
            { path: "events", Component: AllEventsPage },
            { path: "privacidad", Component: PrivacyPolicy },
            { path: "terminos", Component: TermsAndConditions },
            { path: "nosotros", Component: AboutPage },
            { path: "blog", Component: BlogPage },
            { path: "prensa", Component: PressPage },
            { path: "empleos", Component: CareersPage },
            { path: "ayuda", Component: HelpCenterPage },
            { path: "status", Component: StatusPage },
            { path: "seguridad", Component: SecurityPage },
            { path: "integraciones", Component: IntegrationsPage },
            { path: "api-docs", Component: ApiDocsPage },
            { path: "cookies", Component: CookiesPolicyPage },
            { path: "gdpr", Component: DataRightsPage },
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
                    { path: "brokers", Component: AdminBrokers },
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
                    { path: "event/:eventId/venue-designer", Component: VenueDesigner },
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

            // Taquilla (box office) routes (protected)
            {
                path: "taquilla",
                element: (
                    <ProtectedRoute requiredRole="taquilla">
                        <TaquillaDashboard />
                    </ProtectedRoute>
                ),
            },

            // Broker routes (protected)
            {
                path: "broker",
                element: (
                    <ProtectedRoute requiredRole="broker">
                        <BrokerDashboard />
                    </ProtectedRoute>
                ),
            },

            // Gate scanning / check-in (protected) — validador is the
            // primary role, but organization/taquilla can also scan since
            // is_event_gate_staff() authorizes all three server-side too.
            {
                path: "validador",
                element: (
                    <ProtectedRoute requiredRole={["validador", "organization", "taquilla", "superadmin"]}>
                        <ValidadorDashboard />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);
