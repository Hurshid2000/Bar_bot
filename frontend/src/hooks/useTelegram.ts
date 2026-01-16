import { useEffect } from 'react';

export function useTelegram() {
	useEffect(() => {
		if (window.Telegram?.WebApp) {
			const tg = window.Telegram.WebApp;
			tg.ready();
			tg.expand();

			// Применяем тему Telegram
			if (tg.themeParams) {
				const root = document.documentElement;
				if (tg.themeParams.bg_color) {
					root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
				}
				if (tg.themeParams.text_color) {
					root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
				}
				if (tg.themeParams.hint_color) {
					root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
				}
				if (tg.themeParams.link_color) {
					root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
				}
				if (tg.themeParams.button_color) {
					root.style.setProperty(
						'--tg-theme-button-color',
						tg.themeParams.button_color,
					);
				}
				if (tg.themeParams.button_text_color) {
					root.style.setProperty(
						'--tg-theme-button-text-color',
						tg.themeParams.button_text_color,
					);
				}
				if (tg.themeParams.secondary_bg_color) {
					root.style.setProperty(
						'--tg-theme-secondary-bg-color',
						tg.themeParams.secondary_bg_color,
					);
				}
			}
		}
	}, []);

	return {
		webApp: window.Telegram?.WebApp,
		isAvailable: !!window.Telegram?.WebApp,
		initData: window.Telegram?.WebApp?.initData,
		user: window.Telegram?.WebApp?.initDataUnsafe?.user,
	};
}
