/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Telegram WebApp типы
interface TelegramWebApp {
	initData: string;
	initDataUnsafe: any;
	version: string;
	platform: string;
	colorScheme: 'light' | 'dark';
	themeParams: any;
	isExpanded: boolean;
	viewportHeight: number;
	viewportStableHeight: number;
	headerColor: string;
	backgroundColor: string;
	BackButton: any;
	MainButton: any;
	HapticFeedback: any;
	CloudStorage: any;
	BiometricManager: any;
	ready: () => void;
	expand: () => void;
	close: () => void;
	enableClosingConfirmation: () => void;
	disableClosingConfirmation: () => void;
	onEvent: (eventType: string, eventHandler: () => void) => void;
	offEvent: (eventType: string, eventHandler: () => void) => void;
	sendData: (data: string) => void;
	openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
	openTelegramLink: (url: string) => void;
	openInvoice: (url: string, callback?: (status: string) => void) => void;
	showPopup: (params: {
		title?: string;
		message: string;
		buttons?: Array<{ id?: string; type?: string; text: string }>;
	}, callback?: (id: string) => void) => void;
	showAlert: (message: string, callback?: () => void) => void;
	showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
	showScanQrPopup: (params: { text?: string }, callback?: (data: string) => void) => void;
	closeScanQrPopup: () => void;
	readTextFromClipboard: (callback?: (text: string) => void) => void;
	requestWriteAccess: (callback?: (granted: boolean) => void) => void;
	requestContact: (callback?: (granted: boolean) => void) => void;
}

interface Window {
	Telegram?: {
		WebApp: TelegramWebApp;
	};
}
