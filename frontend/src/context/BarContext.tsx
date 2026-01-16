import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Bar } from '../types/common.types';
import { useAuth } from './AuthContext';
import { RoleType } from '../types/common.types';

interface BarContextType {
	selectedBar: Bar | null;
	setSelectedBar: (bar: Bar | null) => void;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
	const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
	const { user } = useAuth();

	// Автоматически устанавливаем бар для WORKER
	useEffect(() => {
		if (user?.role === RoleType.WORKER && user.bars && user.bars.length > 0) {
			const firstBar = user.bars[0].bar;
			if (firstBar) {
				setSelectedBar(firstBar);
			}
		}
	}, [user]);

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
