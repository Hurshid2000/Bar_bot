/// <reference types="vite/client" />

interface TelegramWebApp {
	ready: () => void;
	expand: () => void;
	close: () => void;
	enableClosingConfirmation: () => void;
	disableClosingConfirmation: () => void;
	MainButton: {
		text: string;
		color: string;
		textColor: string;
		isVisible: boolean;
		isActive: boolean;
		isProgressVisible: boolean;
		setText: (text: string) => void;
		onClick: (callback: () => void) => void;
		offClick: (callback: () => void) => void;
		show: () => void;
		hide: () => void;
		enable: () => void;
		disable: () => void;
		showProgress: (leaveActive?: boolean) => void;
		hideProgress: () => void;
	};
	BackButton: {
		isVisible: boolean;
		onClick: (callback: () => void) => void;
		offClick: (callback: () => void) => void;
		show: () => void;
		hide: () => void;
	};
	initData: string;
	initDataUnsafe: {
		user?: {
			id: number;
			first_name: string;
			last_name?: string;
			username?: string;
			language_code?: string;
		};
	};
	version: string;
	platform: string;
	colorScheme: 'light' | 'dark';
	themeParams: {
		bg_color?: string;
		text_color?: string;
		hint_color?: string;
		link_color?: string;
		button_color?: string;
		button_text_color?: string;
		secondary_bg_color?: string;
	};
	isExpanded: boolean;
	viewportHeight: number;
	viewportStableHeight: number;
	headerColor: string;
	backgroundColor: string;
	setHeaderColor: (color: string) => void;
	setBackgroundColor: (color: string) => void;
}

interface Telegram {
	WebApp: TelegramWebApp;
}

interface Window {
	Telegram?: Telegram;
}
