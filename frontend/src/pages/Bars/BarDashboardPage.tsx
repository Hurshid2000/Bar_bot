import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, CreditCard, TrendingDown, Calculator } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { barsApi } from '../../api/bars.api';
import { revenueApi } from '../../api/revenue.api';
import { expensesApi } from '../../api/expenses.api';
import { MetricCard } from '../../components/MetricCard';
import { DatePicker } from '../../components/DatePicker';
import { AddCashModal } from '../../components/AddCashModal';
import { AddCardIncomeModal } from '../../components/AddCardIncomeModal';
import { AddExpenseModal } from '../../components/AddExpenseModal';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
import { format, startOfToday } from 'date-fns';
import { RoleType } from '../../types/common.types';
import './BarDashboardPage.css';

export function BarDashboardPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { hasRole, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
	const [selectedDate, setSelectedDate] = useState(startOfToday());
	const [cashModalOpen, setCashModalOpen] = useState(false);
	const [cardModalOpen, setCardModalOpen] = useState(false);
	const [expenseModalOpen, setExpenseModalOpen] = useState(false);

	// Загружаем данные бара
	const { data: bar, isLoading: barLoading, error: barError } = useQuery({
		queryKey: ['bars', id],
		queryFn: () => barsApi.getById(id!),
		enabled: !!id && !isLoadingAuth && isAuthenticated,
		retry: false,
	});

	// Загружаем выручку за выбранную дату
	const dateStr = format(selectedDate, 'yyyy-MM-dd');
	const { data: revenueData, isLoading: revenueLoading } = useQuery({
		queryKey: ['revenue', id, dateStr],
		queryFn: () =>
			revenueApi.getAll({
				barId: id!,
				date: dateStr,
			}),
		enabled: !!id && !isLoadingAuth && isAuthenticated,
	});

	// Загружаем расходы за выбранную дату
	const { data: expensesData, isLoading: expensesLoading } = useQuery({
		queryKey: ['expenses', id, dateStr],
		queryFn: () =>
			expensesApi.getAll({
				barId: id!,
				date: dateStr,
			}),
		enabled: !!id && !isLoadingAuth && isAuthenticated,
	});

	if (isLoadingAuth || barLoading || revenueLoading || expensesLoading) {
		return <Loading />;
	}

	if (barError) {
		return (
			<div className="bar-dashboard-page">
				<p>Ошибка загрузки бара: {(barError as any)?.message || 'Неизвестная ошибка'}</p>
			</div>
		);
	}

	if (!bar) {
		return (
			<div className="bar-dashboard-page">
				<p>Бар не найден</p>
			</div>
		);
	}

	// Получаем данные за выбранную дату
	const todayRevenue = revenueData?.data.find(
		(r) => r.barId === id && format(new Date(r.date), 'yyyy-MM-dd') === dateStr,
	);
	const cash = todayRevenue?.cash || 0;
	const card = todayRevenue?.card || 0;

	// Суммируем все расходы за день
	const totalExpenses =
		expensesData?.data.reduce((sum, expense) => sum + expense.amount, 0) || 0;

	// Вычисляем общие значения
	const totalRevenue = cash + card; // Наличка + Переводы
	const profit = cash - totalExpenses; // Наличка - Расходы

	const showBackButton = hasRole([RoleType.ADMIN, RoleType.MANAGER]);

	return (
		<div className="bar-dashboard-page">
			{showBackButton && (
				<button
					onClick={() => navigate('/')}
					className="bar-dashboard-back"
				>
					<ArrowLeft className="bar-dashboard-back-icon" />
					<span>Back to Home</span>
				</button>
			)}

			<div className="bar-dashboard-header">
				<div>
					<h1 className="bar-dashboard-title">{bar.name}</h1>
				</div>
				<DatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
			</div>

			<div className="bar-dashboard-metrics">
				<MetricCard
					title="Наличные"
					value={formatCurrency(cash)}
					icon={
						<div className="metric-icon-cash">
							<DollarSign className="metric-icon" />
						</div>
					}
					onClick={() => setCashModalOpen(true)}
					className="metric-card-cash"
				/>

				<MetricCard
					title="Переводы"
					value={formatCurrency(card)}
					icon={
						<div className="metric-icon-card">
							<CreditCard className="metric-icon" />
						</div>
					}
					onClick={() => setCardModalOpen(true)}
					className="metric-card-card"
				/>

				<MetricCard
					title="Расходы"
					value={formatCurrency(totalExpenses)}
					icon={
						<div className="metric-icon-expense">
							<TrendingDown className="metric-icon" />
						</div>
					}
					onClick={() => setExpenseModalOpen(true)}
					className="metric-card-expense"
				/>

				<MetricCard
					title="Общее"
					value={
						<div className="metric-card-total">
							<div className="metric-total-item">
								<span className="metric-total-label">Выручка:</span>
								<span className="metric-total-value revenue">
									{formatCurrency(totalRevenue)}
								</span>
							</div>
							<div className="metric-total-item">
								<span className="metric-total-label">Прибыль:</span>
								<span
									className={`metric-total-value ${
										profit >= 0 ? 'profit' : 'loss'
									}`}
								>
									{formatCurrency(profit)}
								</span>
							</div>
						</div>
					}
					icon={
						<div className="metric-icon-total">
							<Calculator className="metric-icon" />
						</div>
					}
					className="metric-card-total"
				/>
			</div>

			<AddCashModal
				isOpen={cashModalOpen}
				onClose={() => setCashModalOpen(false)}
				barId={id!}
				selectedDate={selectedDate}
				existingCash={cash > 0 ? cash : undefined}
			/>

			<AddCardIncomeModal
				isOpen={cardModalOpen}
				onClose={() => setCardModalOpen(false)}
				barId={id!}
				selectedDate={selectedDate}
				existingCard={card > 0 ? card : undefined}
			/>

			<AddExpenseModal
				isOpen={expenseModalOpen}
				onClose={() => setExpenseModalOpen(false)}
				barId={id!}
				selectedDate={selectedDate}
			/>
		</div>
	);
}
