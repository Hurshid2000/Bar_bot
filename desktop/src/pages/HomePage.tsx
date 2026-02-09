import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { barsApi } from '../api/bars.api';
import { revenueApi } from '../api/revenue.api';
import { BarCard } from '../components/BarCard';
import { Loading } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RoleType, type Bar } from '../types/common.types';
import { format, startOfToday } from 'date-fns';
import './HomePage.css';

export function HomePage() {
	const { user, hasRole } = useAuth();
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

	// Получаем выручку за сегодня для всех баров
	const today = format(startOfToday(), 'yyyy-MM-dd');
	const { data: todayRevenue } = useQuery({
		queryKey: ['revenue', 'today', today],
		queryFn: () => revenueApi.getAll({ startDate: today, endDate: today }),
		enabled: barsToShow.length > 0,
	});

	// Функция для получения выручки бара за сегодня
	const getBarRevenue = (barId: string): number => {
		if (!todayRevenue?.data) return 0;
		const barRevenue = todayRevenue.data.find((r) => r.barId === barId);
		return barRevenue ? barRevenue.cash + barRevenue.card : 0;
	};

	// Функция для получения количества заказов (пока мок, потом будет API)
	const getBarOrders = (_barId: string): number => {
		// TODO: Заменить на реальный API когда будет готов
		return 0;
	};

	const handleBarClick = (barId: string) => {
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
								todayRevenue={getBarRevenue(bar.id)}
								todayOrders={getBarOrders(bar.id)}
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
