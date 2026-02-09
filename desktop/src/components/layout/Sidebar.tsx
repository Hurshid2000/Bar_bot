import { Home, Package, ShoppingCart, BarChart3, Store, Users, ClipboardList, DollarSign, TrendingUp, Wallet, UserCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types/common.types';
import './Sidebar.css';

interface NavItem {
	id: string;
	label: string;
	icon: React.ElementType;
	path: string;
	roles?: RoleType[];
}

const mainNavItems: NavItem[] = [
	{ id: 'home', label: 'Главная', icon: Home, path: '/' },
	{ id: 'catalog', label: 'Каталог', icon: Package, path: '/catalog' },
	{ id: 'orders', label: 'Заказы', icon: ShoppingCart, path: '/orders' },
	{ id: 'reports', label: 'Отчеты', icon: BarChart3, path: '/reports', roles: [RoleType.ADMIN, RoleType.MANAGER] },
];

const managementNavItems: NavItem[] = [
	{ id: 'bars', label: 'Бары', icon: Store, path: '/bars' },
	{ id: 'products', label: 'Товары', icon: ClipboardList, path: '/products' },
	{ id: 'categories', label: 'Категории', icon: ClipboardList, path: '/categories', roles: [RoleType.ADMIN, RoleType.MANAGER] },
	{ id: 'revenue', label: 'Выручка', icon: DollarSign, path: '/revenue' },
	{ id: 'expenses', label: 'Расходы', icon: Wallet, path: '/expenses' },
	{ id: 'purchases', label: 'Закупки', icon: TrendingUp, path: '/purchases' },
];

const adminNavItems: NavItem[] = [
	{ id: 'manage-bars', label: 'Управление барами', icon: Store, path: '/management/bars', roles: [RoleType.ADMIN] },
	{ id: 'manage-users', label: 'Пользователи', icon: Users, path: '/management/users', roles: [RoleType.ADMIN] },
];

export function Sidebar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, hasRole } = useAuth();

	const isActive = (path: string) => {
		if (path === '/') {
			return location.pathname === '/';
		}
		return location.pathname.startsWith(path);
	};

	const canSee = (item: NavItem) => {
		if (!item.roles) return true;
		return hasRole(item.roles);
	};

	const renderNavItem = (item: NavItem) => {
		if (!canSee(item)) return null;
		const Icon = item.icon;
		const active = isActive(item.path);
		return (
			<button
				key={item.id}
				onClick={() => navigate(item.path)}
				className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
			>
				<Icon className="sidebar-item-icon" />
				<span className="sidebar-item-label">{item.label}</span>
			</button>
		);
	};

	return (
		<aside className="sidebar">
			<div className="sidebar-header">
				<h2 className="sidebar-logo" onClick={() => navigate('/')}>Bar CRM</h2>
			</div>

			<nav className="sidebar-nav">
				<div className="sidebar-section">
					<span className="sidebar-section-title">Меню</span>
					{mainNavItems.map(renderNavItem)}
				</div>

				<div className="sidebar-section">
					<span className="sidebar-section-title">Управление</span>
					{managementNavItems.map(renderNavItem)}
				</div>

				{hasRole([RoleType.ADMIN]) && (
					<div className="sidebar-section">
						<span className="sidebar-section-title">Администрирование</span>
						{adminNavItems.map(renderNavItem)}
					</div>
				)}
			</nav>

			<div className="sidebar-footer">
				<div className="sidebar-user">
					<UserCircle className="sidebar-user-icon" />
					<div className="sidebar-user-info">
						<span className="sidebar-user-name">{user?.name || 'Пользователь'}</span>
						<span className="sidebar-user-role">{user?.role || ''}</span>
					</div>
				</div>
			</div>
		</aside>
	);
}
