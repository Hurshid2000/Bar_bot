import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
	children: ReactNode;
	requiredRoles?: string[];
}

export function ProtectedRoute({
	children,
	requiredRoles,
}: ProtectedRouteProps) {
	const { isAuthenticated, user } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/auth/login" replace />;
	}

	if (
		requiredRoles &&
		user &&
		!requiredRoles.includes(user.role)
	) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}
