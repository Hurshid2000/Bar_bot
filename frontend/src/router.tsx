import { createHashRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/Auth/LoginPage';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BarsListPage } from './pages/Bars/BarsListPage';
import { BarDashboardPage } from './pages/Bars/BarDashboardPage';
import { BarsManagementPage } from './pages/Bars/BarsManagementPage';
import { UsersManagementPage } from './pages/Users/UsersManagementPage';
import { ProductsListPage } from './pages/Products/ProductsListPage';
import { ProductDetailPage } from './pages/Products/ProductDetailPage';
import { CategoriesListPage } from './pages/Categories/CategoriesListPage';
import { CatalogPage } from './pages/Catalog';
import { RevenueListPage } from './pages/Revenue/RevenueListPage';
import { ExpensesListPage } from './pages/Expenses/ExpensesListPage';
import { PurchasesListPage } from './pages/Purchases/PurchasesListPage';
import { SportpitSalesPage } from './pages/Sportpit/SportpitSalesPage';
import { SportpitArrivalsPage } from './pages/Sportpit/SportpitArrivalsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { CashAuditReportPage } from './pages/Reports/CashAuditReportPage';
import { ProfitReportPage } from './pages/Reports/ProfitReportPage';
import { SportpitReportPage } from './pages/Reports/SportpitReportPage';
import { OrdersPage } from './pages/Orders/OrdersPage';
import { OrderCreatePage } from './pages/Orders/OrderCreatePage';
import { OrderHistoryPage } from './pages/Orders/OrderHistoryPage';
import { OrderStatusPage } from './pages/Orders/OrderStatusPage';
import { ArrivalCreatePage } from './pages/Arrivals/ArrivalCreatePage';
import { ArrivalsSummaryPage } from './pages/Arrivals/ArrivalsSummaryPage';
import { InventoryPage } from './pages/Inventories/InventoryPage';
import { InventoryDetailPage } from './pages/Inventories/InventoryDetailPage';
import { ClientsPage } from './pages/Clients/ClientsPage';
import { ClientDetailPage } from './pages/Clients/ClientDetailPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { RoleType } from './types/common.types';

// Используем HashRouter для совместимости с Telegram Mini App
// HashRouter использует URL с # (например, /#/bars/123), что позволяет
// работать без серверного fallback при перезагрузке страницы
export const router = createHashRouter([
	{
		path: '/auth/login',
		element: <LoginPage />,
	},
	{
		element: (
			<ProtectedRoute>
				<Layout />
			</ProtectedRoute>
		),
		children: [
			{
				path: '/',
				element: <HomePage />,
			},
			{
				path: '/dashboard',
				element: <DashboardPage />,
			},
			{
				path: '/bars',
				element: <BarsListPage />,
			},
			{
				path: '/bars/:id',
				element: <BarDashboardPage />,
			},
			{
				path: '/management/bars',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN]}>
						<BarsManagementPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/management/users',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN]}>
						<UsersManagementPage />
					</ProtectedRoute>
				),
			},
		{
			path: '/catalog',
			element: <CatalogPage />,
		},
		{
			path: '/products',
			element: <ProductsListPage />,
		},
		{
			path: '/products/:id',
			element: <ProductDetailPage />,
		},
			{
				path: '/categories',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN, RoleType.MANAGER]}>
						<CategoriesListPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/revenue',
				element: <RevenueListPage />,
			},
			{
				path: '/expenses',
				element: <ExpensesListPage />,
			},
			{
				path: '/purchases',
				element: <PurchasesListPage />,
			},
			{
				path: '/sportpit/sales',
				element: <SportpitSalesPage />,
			},
			{
				path: '/sportpit/arrivals',
				element: <SportpitArrivalsPage />,
			},
			{
				path: '/reports',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN, RoleType.MANAGER]}>
						<ReportsPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/reports/cash-audit',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN, RoleType.MANAGER]}>
						<CashAuditReportPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/reports/profit',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN]}>
						<ProfitReportPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/reports/sportpit',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN, RoleType.MANAGER]}>
						<SportpitReportPage />
					</ProtectedRoute>
				),
			},
			{
				path: '/orders',
				element: <OrdersPage />,
			},
			{
				path: '/orders/create',
				element: <OrderCreatePage />,
			},
			{
				path: '/orders/history',
				element: <OrderHistoryPage />,
			},
			{
				path: '/orders/:id',
				element: <OrderStatusPage />,
			},
			{
				path: '/arrivals/create',
				element: <ArrivalCreatePage />,
			},
			{
				path: '/arrivals/summary',
				element: <ArrivalsSummaryPage />,
			},
			{
				path: '/bars/:id/inventory',
				element: <InventoryPage />,
			},
			{
				path: '/inventories/:id',
				element: <InventoryDetailPage />,
			},
			{
				path: '/bars/:id/clients',
				element: <ClientsPage />,
			},
		{
			path: '/clients/:id',
			element: <ClientDetailPage />,
		},
		{
			path: '/settings',
			element: <SettingsPage />,
		},
	],
},
	{
		path: '*',
		element: <Navigate to="/" replace />,
	},
]);
