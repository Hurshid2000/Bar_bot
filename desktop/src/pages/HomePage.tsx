import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBar } from '../context/BarContext';
import { barsApi } from '../api/bars.api';
import { revenueApi } from '../api/revenue.api';
import { expensesApi } from '../api/expenses.api';
import { BarCard } from '../components/BarCard';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RoleType, type Bar } from '../types/common.types';
import { format, startOfMonth } from 'date-fns';
import './HomePage.css';

export function HomePage() {
	const { user, hasRole } = useAuth();
	const { setSelectedBar } = useBar();
	const navigate = useNavigate();

	// Редирект для WORKER на страницу его бара
	useEffect(() => {
		if (user?.role === RoleType.WORKER && user.bars && user.bars.length > 0) {
			const firstBarId = user.bars[0].barId;
			navigate(`/bars/${firstBarId}`, { replace: true });
		}
	}, [user, navigate]);

	// Получаем бары в зависимости от роли
	const { data: allBars, isLoading: barsLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: hasRole([RoleType.ADMIN]),
	});

	// Для MANAGER используем бары из user.bars
	const managerBars: Bar[] = hasRole([RoleType.MANAGER])
		? user?.bars
				?.map((userBar) => userBar.bar)
				.filter((bar): bar is Bar => bar !== null && bar !== undefined) || []
		: [];

	// Определяем какие бары показывать
	const barsToShow = hasRole([RoleType.ADMIN])
		? allBars || []
		: managerBars;

	// Если WORKER, показываем loading (будет редирект)
	if (user?.role === RoleType.WORKER) {
		return <Loading />;
	}

	// Даты текущего месяца
	const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
	const today = format(new Date(), 'yyyy-MM-dd');

	// Получаем выручку за текущий месяц для всех баров
	const { data: monthlyRevenue } = useQuery({
		queryKey: ['revenue', 'month', monthStart, today],
		queryFn: () => revenueApi.getAll({ startDate: monthStart, endDate: today, limit: 1000 }),
		enabled: barsToShow.length > 0,
	});

	// Получаем расходы за текущий месяц для всех баров
	const { data: monthlyExpenses } = useQuery({
		queryKey: ['expenses', 'month', monthStart, today],
		queryFn: () => expensesApi.getAll({ startDate: monthStart, endDate: today, limit: 1000 }),
		enabled: barsToShow.length > 0,
	});

	// Суммируем наличку за месяц для бара
	const getBarMonthlyCash = (barId: string): number => {
		if (!monthlyRevenue?.data) return 0;
		return monthlyRevenue.data
			.filter((r) => r.barId === barId)
			.reduce((sum, r) => sum + (r.cash || 0), 0);
	};

	// Суммируем карту за месяц для бара
	const getBarMonthlyCard = (barId: string): number => {
		if (!monthlyRevenue?.data) return 0;
		return monthlyRevenue.data
			.filter((r) => r.barId === barId)
			.reduce((sum, r) => sum + (r.card || 0), 0);
	};

	// Суммируем расходы за месяц для бара
	const getBarMonthlyExpenses = (barId: string): number => {
		if (!monthlyExpenses?.data) return 0;
		return monthlyExpenses.data
			.filter((e) => e.barId === barId)
			.reduce((sum, e) => sum + (e.amount || 0), 0);
	};

	const handleBarClick = (barId: string) => {
		// Запоминаем выбранный бар в контексте
		const bar = barsToShow.find((b) => b.id === barId);
		if (bar) {
			setSelectedBar(bar);
		}
		navigate(`/bars/${barId}`);
	};

	if (barsLoading) {
		return <Loading />;
	}

	return (
		<div className="home-page">
			<section className="home-section">
				<h2 className="home-section-title">My Bars</h2>
				{barsToShow.length > 0 ? (
					<div className="home-bars-list">
						{barsToShow.map((bar) => (
							<BarCard
								key={bar.id}
								id={bar.id}
								name={bar.name}
								monthlyCash={getBarMonthlyCash(bar.id)}
								monthlyCard={getBarMonthlyCard(bar.id)}
								monthlyExpenses={getBarMonthlyExpenses(bar.id)}
								onClick={handleBarClick}
							/>
						))}
					</div>
				) : (
					<Card>
						<p className="home-empty-message">Бары не найдены</p>
					</Card>
				)}
			</section>

			{hasRole([RoleType.ADMIN]) && (
				<section className="home-management-section">
					<div className="home-management-buttons">
						<Button
							variant="outline"
							size="lg"
							className="home-management-button"
							onClick={() => navigate('/management/bars')}
						>
							Бары
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="home-management-button"
							onClick={() => navigate('/management/users')}
						>
							Пользователи
						</Button>
						<Button
							variant="outline"
							size="lg"
							className="home-management-button"
							onClick={() => navigate('/categories')}
						>
							Категории
						</Button>
					</div>
				</section>
			)}
		</div>
	);
}
