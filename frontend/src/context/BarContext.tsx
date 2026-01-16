import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Bar } from '../types/common.types';

interface BarContextType {
	selectedBar: Bar | null;
	setSelectedBar: (bar: Bar | null) => void;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export function BarProvider({ children }: { children: ReactNode }) {
	const [selectedBar, setSelectedBar] = useState<Bar | null>(null);

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
