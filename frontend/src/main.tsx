import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Инициализация Telegram WebApp
if (window.Telegram?.WebApp) {
	const tg = window.Telegram.WebApp;
	tg.ready();
	tg.expand();
	console.log('✅ Telegram WebApp инициализирован');
	console.log('  Версия:', tg.version);
	console.log('  Платформа:', tg.platform);
	console.log('  initData:', tg.initData || 'не доступен');
} else {
	console.warn('⚠️ Telegram WebApp не доступен (работа вне Telegram)');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
