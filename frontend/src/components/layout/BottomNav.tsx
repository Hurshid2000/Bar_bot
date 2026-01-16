import { Home, Package, ShoppingCart, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export function BottomNav() {
	const navigate = useNavigate();
	const location = useLocation();

	const tabs = [
		{ id: 'home', label: 'Home', icon: Home, path: '/' },
		{ id: 'catalog', label: 'Catalog', icon: Package, path: '/catalog' },
		{ id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders' },
		{ id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
	];

	const handleTabClick = (path: string, id: string) => {
		if (id === 'home') {
			navigate(path);
		} else {
			// Заглушки для остальных табов
			alert('Coming soon');
		}
	};

	const isActive = (path: string) => {
		if (path === '/') {
			return location.pathname === '/';
		}
		return location.pathname.startsWith(path);
	};

	return (
		<nav className="bottom-nav">
			<div className="bottom-nav-content">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const active = isActive(tab.path);
					return (
						<button
							key={tab.id}
							onClick={() => handleTabClick(tab.path, tab.id)}
							className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
						>
							<Icon className="bottom-nav-icon" />
							<span className="bottom-nav-label">{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
