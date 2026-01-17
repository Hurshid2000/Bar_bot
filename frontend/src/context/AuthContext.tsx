import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/common.types';
import { RoleType } from '../types/common.types';
import { getToken, removeToken } from '../api/auth.api';
import { usersApi } from '../api/users.api';

interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	setUser: (user: User | null) => void;
	setToken: (token: string | null) => void;
	logout: () => void;
	hasRole: (roles: RoleType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setTokenState] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadUser = async () => {
			setIsLoading(true);
			const savedToken = getToken();
			if (savedToken) {
				setTokenState(savedToken);
				// Загружаем данные пользователя при инициализации
				try {
					const userData = await usersApi.getCurrent();
					setUser(userData);
				} catch (error) {
					console.error('Failed to load user on init:', error);
					// Если токен невалидный, удаляем его
					removeToken();
					setTokenState(null);
					setUser(null);
				}
			}
			setIsLoading(false);
		};

		loadUser();
	}, []);

	const setToken = (newToken: string | null) => {
		setTokenState(newToken);
		if (!newToken) {
			removeToken();
		}
	};

	const logout = () => {
		setUser(null);
		setToken(null);
	};

	const hasRole = (roles: RoleType[]): boolean => {
		if (!user) return false;
		return roles.includes(user.role as RoleType);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				token,
				isAuthenticated: !!user && !!token,
				isLoading,
				setUser,
				setToken,
				logout,
				hasRole,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
