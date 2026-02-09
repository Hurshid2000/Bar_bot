import { Home, Package, ShoppingCart, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export function BottomNav() {
	const navigate = useNavigate();
	const location = useLocation();

	const tabs = [
		{ id: 'home', label: 'Home', icon: Home, path: '/', enabled: true },
		{ id: 'catalog', label: 'Catalog', icon: Package, path: '/catalog', enabled: true },
		{ id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders', enabled: true },
		{ id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports', enabled: true },
	];

	const handleTabClick = (path: string, enabled: boolean) => {
		if (enabled) {
			navigate(path);
		} else {
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
							onClick={() => handleTabClick(tab.path, tab.enabled)}
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
