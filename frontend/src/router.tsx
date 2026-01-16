import { createBrowserRouter, Navigate } from 'react-router-dom';
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
import { RevenueListPage } from './pages/Revenue/RevenueListPage';
import { ExpensesListPage } from './pages/Expenses/ExpensesListPage';
import { PurchasesListPage } from './pages/Purchases/PurchasesListPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { RoleType } from './types/common.types';

export const router = createBrowserRouter([
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
				path: '/reports',
				element: (
					<ProtectedRoute requiredRoles={[RoleType.ADMIN, RoleType.MANAGER]}>
						<ReportsPage />
					</ProtectedRoute>
				),
			},
		],
	},
	{
		path: '*',
		element: <Navigate to="/" replace />,
	},
]);
