import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBar } from '../context/BarContext';
import { barsApi } from '../api/bars.api';
import type { BarMonthlyStats } from '../api/bars.api';
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

	// Получаем месячную статистику баров (агрегация на бекенде)
	const { data: monthlyStats } = useQuery({
		queryKey: ['bars', 'monthly-stats', monthStart, today],
		queryFn: () => barsApi.getMonthlyStats(monthStart, today),
		enabled: barsToShow.length > 0,
	});

	// Получаем статистику для конкретного бара
	const getBarStats = (barId: string): BarMonthlyStats => {
		const stats = monthlyStats?.find((s) => s.barId === barId);
		return stats || { barId, barName: '', totalCash: 0, totalCard: 0, totalRevenue: 0, totalExpenses: 0 };
	};

	const handleBarClick = (barId: string) => {
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
						{barsToShow.map((bar) => {
							const stats = getBarStats(bar.id);
							return (
								<BarCard
									key={bar.id}
									id={bar.id}
									name={bar.name}
									monthlyCash={stats.totalCash}
									monthlyCard={stats.totalCard}
									monthlyExpenses={stats.totalExpenses}
									onClick={handleBarClick}
								/>
							);
						})}
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

			<section className="home-section">
				<h2 className="home-section-title">Настройки</h2>
				<Button
					variant="outline"
					size="md"
					onClick={() => navigate('/settings')}
					className="home-pin-button"
				>
					Профиль и PIN-код
				</Button>
			</section>
		</div>
	);
}
