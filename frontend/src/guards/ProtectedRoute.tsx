import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/ui/Loading';

interface ProtectedRouteProps {
	children: ReactNode;
	requiredRoles?: string[];
}

export function ProtectedRoute({
	children,
	requiredRoles,
}: ProtectedRouteProps) {
	const { isAuthenticated, user, isLoading } = useAuth();

	// Показываем loading, пока проверяем авторизацию
	if (isLoading) {
		return <Loading />;
	}

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
