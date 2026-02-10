import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/common.types';
import { RoleType } from '../types/common.types';
import { getToken, removeToken, getSessionStart } from '../api/auth.api';
import { usersApi } from '../api/users.api';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 часов в мс

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
	const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const logout = useCallback(() => {
		setUser(null);
		setTokenState(null);
		removeToken();
		if (sessionTimerRef.current) {
			clearTimeout(sessionTimerRef.current);
			sessionTimerRef.current = null;
		}
	}, []);

	// Запускает таймер автовыхода
	const startSessionTimer = useCallback(() => {
		// Очищаем предыдущий таймер
		if (sessionTimerRef.current) {
			clearTimeout(sessionTimerRef.current);
		}

		const sessionStart = getSessionStart();
		if (!sessionStart) return;

		const elapsed = Date.now() - sessionStart;
		const remaining = SESSION_DURATION_MS - elapsed;

		if (remaining <= 0) {
			// Сессия уже истекла
			logout();
			return;
		}

		// Ставим таймер на оставшееся время
		sessionTimerRef.current = setTimeout(() => {
			logout();
		}, remaining);
	}, [logout]);

	useEffect(() => {
		const loadUser = async () => {
			setIsLoading(true);
			const savedToken = getToken();

			if (savedToken) {
				// Проверяем не истекла ли сессия
				const sessionStart = getSessionStart();
				if (sessionStart && (Date.now() - sessionStart) >= SESSION_DURATION_MS) {
					// Сессия истекла
					removeToken();
					setIsLoading(false);
					return;
				}

				setTokenState(savedToken);
				try {
					const userData = await usersApi.getCurrent();
					setUser(userData);
					// Запускаем таймер автовыхода
					startSessionTimer();
				} catch (error: any) {
					console.error('Failed to load user on init:', error);
					removeToken();
					setTokenState(null);
					setUser(null);
				}
			}
			setIsLoading(false);
		};

		loadUser();

		// Очистка при размонтировании
		return () => {
			if (sessionTimerRef.current) {
				clearTimeout(sessionTimerRef.current);
			}
		};
	}, [startSessionTimer]);

	// Периодическая проверка сессии (каждую минуту)
	useEffect(() => {
		if (!token) return;

		const interval = setInterval(() => {
			const sessionStart = getSessionStart();
			if (sessionStart && (Date.now() - sessionStart) >= SESSION_DURATION_MS) {
				logout();
			}
		}, 60_000); // Каждую минуту

		return () => clearInterval(interval);
	}, [token, logout]);

	const setToken = (newToken: string | null) => {
		setTokenState(newToken);
		if (newToken) {
			startSessionTimer();
		} else {
			removeToken();
			if (sessionTimerRef.current) {
				clearTimeout(sessionTimerRef.current);
				sessionTimerRef.current = null;
			}
		}
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
