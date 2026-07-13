import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: UserRole;
    requireMFA?: boolean;
}

export default function ProtectedRoute({
    children,
    requiredRole,
    requireMFA = true,
}: ProtectedRouteProps) {
    const { isAuthenticated, mfaVerified, user, user: authUser } = useAuth();
    const location = useLocation();

    // Not logged in at all → go to login
    if (!authUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but MFA not verified → go to MFA page
    if (!isAuthenticated || (requireMFA && !mfaVerified)) {
        return <Navigate to="/mfa" state={{ from: location }} replace />;
    }

    // Wrong role → go to their correct dashboard
    if (requiredRole && user?.role !== requiredRole) {
        const dashboardPath =
            user?.role === 'superadmin'
                ? '/admin'
                : user?.role === 'organization'
                    ? '/organization'
                    : '/wallet';
        return <Navigate to={dashboardPath} replace />;
    }

    return <>{children}</>;
}
