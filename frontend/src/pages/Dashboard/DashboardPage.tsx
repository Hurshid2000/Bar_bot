import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { barsApi } from '../../api/bars.api';
import { revenueApi } from '../../api/revenue.api';
import { expensesApi } from '../../api/expenses.api';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
import { RoleType } from '../../types/common.types';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import './DashboardPage.css';

export function DashboardPage() {
	const { user, hasRole } = useAuth();

	const { data: bars, isLoading: barsLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: hasRole([RoleType.ADMIN, RoleType.MANAGER]),
	});

	const { data: revenue, isLoading: revenueLoading } = useQuery({
		queryKey: ['revenue', 'recent'],
		queryFn: () => revenueApi.getAll({ limit: 10, page: 1 }),
	});

	const { data: expenses, isLoading: expensesLoading } = useQuery({
		queryKey: ['expenses', 'recent'],
		queryFn: () => expensesApi.getAll({ limit: 10, page: 1 }),
	});

	if (barsLoading || revenueLoading || expensesLoading) {
		return <Loading />;
	}

	const totalRevenue =
		revenue?.data.reduce((sum, r) => sum + r.cash + r.card, 0) || 0;
	const totalExpenses = expenses?.data.reduce((sum, e) => sum + e.amount, 0) || 0;
	const profit = totalRevenue - totalExpenses;

	return (
		<div className="dashboard">
			<h1>Добро пожаловать, {user?.name}!</h1>

			<div className="dashboard-stats">
				<Card title="Выручка" className="dashboard-stat-card">
					<div className="dashboard-stat-value revenue">
						{formatCurrency(totalRevenue)}
					</div>
				</Card>

				<Card title="Расходы" className="dashboard-stat-card">
					<div className="dashboard-stat-value expense">
						{formatCurrency(totalExpenses)}
					</div>
				</Card>

				<Card title="Прибыль" className="dashboard-stat-card">
					<div className="dashboard-stat-value profit">
						{formatCurrency(profit)}
					</div>
				</Card>

				{hasRole([RoleType.ADMIN, RoleType.MANAGER]) && bars && (
					<Card title="Баров" className="dashboard-stat-card">
						<div className="dashboard-stat-value">{bars.length}</div>
					</Card>
				)}
			</div>

			<div className="dashboard-actions">
				<Card title="Быстрые действия">
					<div className="dashboard-actions-grid">
						<Link to="/revenue">
							<Button variant="primary">Добавить выручку</Button>
						</Link>
						<Link to="/expenses">
							<Button variant="primary">Добавить расход</Button>
						</Link>
						<Link to="/purchases">
							<Button variant="primary">Добавить закупку</Button>
						</Link>
						{hasRole([RoleType.ADMIN, RoleType.MANAGER]) && (
							<>
								<Link to="/bars">
									<Button variant="outline">Управление барами</Button>
								</Link>
								<Link to="/products">
									<Button variant="outline">Управление продуктами</Button>
								</Link>
								<Link to="/reports">
									<Button variant="outline">Отчеты</Button>
								</Link>
							</>
						)}
					</div>
				</Card>
			</div>
		</div>
	);
}
