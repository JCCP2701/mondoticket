import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, UserRole, dashboardPathForRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: UserRole | UserRole[];
    requireMFA?: boolean;
}

export default function ProtectedRoute({
    children,
    requiredRole,
    requireMFA = true,
}: ProtectedRouteProps) {
    const { isAuthenticated, mfaVerified, user, user: authUser, authLoading } = useAuth();
    const location = useLocation();

    // Session restore (getSession + profile load) hasn't finished yet — wait
    // instead of redirecting, otherwise every page refresh briefly sees
    // user=null and bounces an already-logged-in user to /login.
    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Cargando...</div>;
    }

    // Not logged in at all → go to login
    if (!authUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but MFA not verified → go to MFA page
    if (!isAuthenticated || (requireMFA && !mfaVerified)) {
        return <Navigate to="/mfa" state={{ from: location }} replace />;
    }

    // Wrong role → go to their correct dashboard
    const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : null;
    if (allowedRoles && !(user?.role && allowedRoles.includes(user.role))) {
        return <Navigate to={dashboardPathForRole(user?.role)} replace />;
    }

    return <>{children}</>;
}
