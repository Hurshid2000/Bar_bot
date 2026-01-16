import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/common.types';
import { RoleType } from '../types/common.types';
import { getToken, removeToken } from '../api/auth.api';

interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	setUser: (user: User | null) => void;
	setToken: (token: string | null) => void;
	logout: () => void;
	hasRole: (roles: RoleType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setTokenState] = useState<string | null>(null);

	useEffect(() => {
		const savedToken = getToken();
		if (savedToken) {
			setTokenState(savedToken);
		}
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
