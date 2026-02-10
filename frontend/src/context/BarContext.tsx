import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Bar } from '../types/common.types';
import { useAuth } from './AuthContext';
import { RoleType } from '../types/common.types';

const SELECTED_BAR_KEY = 'selectedBar';

interface BarContextType {
	selectedBar: Bar | null;
	setSelectedBar: (bar: Bar | null) => void;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
	const [selectedBar, setSelectedBarState] = useState<Bar | null>(() => {
		try {
			const saved = localStorage.getItem(SELECTED_BAR_KEY);
			return saved ? JSON.parse(saved) : null;
		} catch {
			return null;
		}
	});
	const { user } = useAuth();

	const setSelectedBar = useCallback((bar: Bar | null) => {
		setSelectedBarState(bar);
		if (bar) {
			localStorage.setItem(SELECTED_BAR_KEY, JSON.stringify(bar));
		} else {
			localStorage.removeItem(SELECTED_BAR_KEY);
		}
	}, []);

	useEffect(() => {
		if (!user) return;

		// Проверяем доступ к текущему выбранному бару
		if (selectedBar && user.bars) {
			const hasAccess = user.role === RoleType.ADMIN ||
				user.bars.some((ub) => ub.barId === selectedBar.id);
			if (!hasAccess) {
				setSelectedBar(null);
			}
			return;
		}

		// WORKER — автоматически первый бар
		if (user.role === RoleType.WORKER && user.bars && user.bars.length > 0) {
			const firstBar = user.bars[0].bar;
			if (firstBar) setSelectedBar(firstBar);
			return;
		}

		// MANAGER — автоматически первый бар если ничего не выбрано
		if (user.role === RoleType.MANAGER && user.bars && user.bars.length > 0 && !selectedBar) {
			const firstBar = user.bars[0].bar;
			if (firstBar) setSelectedBar(firstBar);
		}
	}, [user, selectedBar, setSelectedBar]);

	return (
		<BarContext.Provider value={{ selectedBar, setSelectedBar }}>
			{children}
		</BarContext.Provider>
	);
}

export function useBar() {
	const context = useContext(BarContext);
	if (context === undefined) {
		throw new Error('useBar must be used within a BarProvider');
	}
	return context;
}
