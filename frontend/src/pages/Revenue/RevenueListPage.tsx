import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit2, User as UserIcon, TrendingDown, Dumbbell } from 'lucide-react';
import { revenueApi } from '../../api/revenue.api';
import { expensesApi } from '../../api/expenses.api';
import { salesApi, type Sale } from '../../api/sales.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
import { RoleType, type Revenue, type Expense } from '../../types/common.types';
import './RevenueListPage.css';

function getMonthDays(year: number, month: number): Date[] {
	const days: Date[] = [];
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	for (let d = 1; d <= daysInMonth; d++) {
		days.push(new Date(year, month, d));
	}
	return days;
}

function formatDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function formatDayLabel(date: Date): string {
	return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const MONTH_NAMES = [
	'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
	'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function RevenueListPage() {
	const { selectedBar } = useBar();
	const { user, hasRole } = useAuth();
	const queryClient = useQueryClient();
	const isAdmin = hasRole([RoleType.ADMIN]);

	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());

	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
	const [cashInput, setCashInput] = useState('');
	const [cardInput, setCardInput] = useState('');

	const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
	const lastDay = new Date(year, month + 1, 0).getDate();
	const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

	const { data, isLoading } = useQuery({
		queryKey: ['revenue', selectedBar?.id, startDate, endDate],
		queryFn: () =>
			revenueApi.getAll({
				barId: selectedBar?.id,
				startDate,
				endDate,
				page: 1,
				limit: 50,
			}),
		enabled: !!selectedBar,
	});

	// Запрос расходов за этот месяц
	const { data: expensesData } = useQuery({
		queryKey: ['expenses', selectedBar?.id, startDate, endDate],
		queryFn: () =>
			expensesApi.getAll({
				barId: selectedBar?.id,
				startDate,
				endDate,
				page: 1,
				limit: 100,
			}),
		enabled: !!selectedBar,
	});

	// Запрос продаж спортпита
	const { data: salesData } = useQuery({
		queryKey: ['sales-daily', selectedBar?.id, startDate, endDate],
		queryFn: () => salesApi.getDaily(selectedBar!.id, startDate, endDate),
		enabled: !!selectedBar,
	});

	const revenueMap = useMemo(() => {
		const map = new Map<string, Revenue>();
		if (data?.data) {
			for (const rev of data.data) {
				const dateKey = rev.date.slice(0, 10);
				map.set(dateKey, rev);
			}
		}
		return map;
	}, [data]);

	// Карта: dateKey -> Expense[]
	const expensesMap = useMemo(() => {
		const map = new Map<string, Expense[]>();
		if (expensesData?.data) {
			for (const exp of expensesData.data) {
				const dateKey = exp.date.slice(0, 10);
				const list = map.get(dateKey) || [];
				list.push(exp);
				map.set(dateKey, list);
			}
		}
		return map;
	}, [expensesData]);

	const salesMap = useMemo(() => {
		const map = new Map<string, Sale[]>();
		if (salesData) {
			for (const sale of salesData) {
				const dateKey = sale.date.slice(0, 10);
				const list = map.get(dateKey) || [];
				list.push(sale);
				map.set(dateKey, list);
			}
		}
		return map;
	}, [salesData]);

	const days = useMemo(() => getMonthDays(year, month), [year, month]);

	const monthTotal = useMemo(() => {
		let cash = 0;
		let card = 0;
		let expenses = 0;
		let sportpit = 0;
		if (data?.data) {
			for (const rev of data.data) {
				cash += rev.cash;
				card += rev.card;
			}
		}
		if (expensesData?.data) {
			for (const exp of expensesData.data) {
				expenses += exp.amount;
			}
		}
		if (salesData) {
			for (const sale of salesData) {
				sportpit += sale.total;
			}
		}
		return { cash, card, total: cash + card, expenses, sportpit };
	}, [data, expensesData, salesData]);

	const goToPrevMonth = () => {
		if (month === 0) { setMonth(11); setYear(year - 1); }
		else setMonth(month - 1);
	};

	const goToNextMonth = () => {
		if (month === 11) { setMonth(0); setYear(year + 1); }
		else setMonth(month + 1);
	};

	const createMutation = useMutation({
		mutationFn: (dto: { barId: string; date: string; cash: number; card: number }) =>
			revenueApi.create(dto),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['revenue'] });
			queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
			closeModal();
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, cash, card }: { id: string; cash: number; card: number }) =>
			revenueApi.update(id, { cash, card }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['revenue'] });
			queryClient.invalidateQueries({ queryKey: ['monthly-stats'] });
			closeModal();
		},
	});

	const openDay = (day: Date) => {
		const dateKey = formatDateKey(day);
		const existing = revenueMap.get(dateKey);
		setSelectedDay(day);
		setEditingRevenue(existing || null);
		setCashInput(existing ? String(existing.cash) : '');
		setCardInput(existing ? String(existing.card) : '');
	};

	const closeModal = () => {
		setSelectedDay(null);
		setEditingRevenue(null);
		setCashInput('');
		setCardInput('');
	};

	const canEdit = (revenue: Revenue | null): boolean => {
		if (isAdmin) return true;
		if (!revenue) return true;
		if (!revenue.createdById) return true;
		return revenue.createdById === user?.id;
	};

	const handleSave = () => {
		if (!selectedBar || !selectedDay) return;
		const cash = parseFloat(cashInput) || 0;
		const card = parseFloat(cardInput) || 0;
		const dateKey = formatDateKey(selectedDay);

		if (editingRevenue) {
			updateMutation.mutate({ id: editingRevenue.id, cash, card });
		} else {
			createMutation.mutate({ barId: selectedBar.id, date: dateKey, cash, card });
		}
	};

	const isToday = (day: Date): boolean => {
		const today = new Date();
		return day.getDate() === today.getDate()
			&& day.getMonth() === today.getMonth()
			&& day.getFullYear() === today.getFullYear();
	};

	const selectedDayExpenses = selectedDay
		? expensesMap.get(formatDateKey(selectedDay)) || []
		: [];

	const selectedDayExpenseTotal = selectedDayExpenses.reduce((s, e) => s + e.amount, 0);

	const selectedDaySales = selectedDay ? salesMap.get(formatDateKey(selectedDay)) || [] : [];
	const selectedDaySalesTotal = selectedDaySales.reduce((s, sale) => s + sale.total, 0);

	if (!selectedBar) {
		return (
			<div className="revenue-list-page">
				<p className="revenue-no-bar">Выберите бар для просмотра выручки</p>
			</div>
		);
	}

	return (
		<div className="revenue-list-page">
			<div className="revenue-page-header">
				<h1>Выручка</h1>
			</div>

			<div className="revenue-month-picker">
				<button className="revenue-month-btn" onClick={goToPrevMonth}>
					<ChevronLeft size={20} />
				</button>
				<span className="revenue-month-label">
					{MONTH_NAMES[month]} {year}
				</span>
				<button className="revenue-month-btn" onClick={goToNextMonth}>
					<ChevronRight size={20} />
				</button>
			</div>

			<div className="revenue-month-summary">
				<div className="revenue-summary-item">
					<span className="revenue-summary-label">Наличные</span>
					<span className="revenue-summary-value">{formatCurrency(monthTotal.cash)}</span>
				</div>
				<div className="revenue-summary-item">
					<span className="revenue-summary-label">Карта</span>
					<span className="revenue-summary-value">{formatCurrency(monthTotal.card)}</span>
				</div>
				<div className="revenue-summary-item revenue-summary-total">
					<span className="revenue-summary-label">Итого</span>
					<span className="revenue-summary-value">{formatCurrency(monthTotal.total)}</span>
				</div>
				<div className="revenue-summary-item revenue-summary-sportpit">
					<span className="revenue-summary-label">Спортпит</span>
					<span className="revenue-summary-value">{formatCurrency(monthTotal.sportpit)}</span>
				</div>
				<div className="revenue-summary-item revenue-summary-expenses">
					<span className="revenue-summary-label">Расход</span>
					<span className="revenue-summary-value">{formatCurrency(monthTotal.expenses)}</span>
				</div>
			</div>

			{isLoading ? (
				<Loading />
			) : (
				<div className="revenue-days-grid">
					{days.map((day) => {
						const dateKey = formatDateKey(day);
						const rev = revenueMap.get(dateKey);
						const dayExpenses = expensesMap.get(dateKey) || [];
						const dayExpenseTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
						const daySales = salesMap.get(dateKey) || [];
						const daySalesTotal = daySales.reduce((s, sale) => s + sale.total, 0);
						const hasData = !!rev || dayExpenses.length > 0 || daySales.length > 0;
						const dayIsToday = isToday(day);

						return (
							<button
								key={dateKey}
								className={`revenue-day-card ${hasData ? 'revenue-day-has-data' : 'revenue-day-empty'} ${dayIsToday ? 'revenue-day-today' : ''}`}
								onClick={() => openDay(day)}
							>
								<div className="revenue-day-header">
									<span className="revenue-day-number">{day.getDate()}</span>
									{dayIsToday && <span className="revenue-day-today-badge">Сегодня</span>}
								</div>

								{hasData ? (
									<div className="revenue-day-data">
										{rev && (
											<>
												<div className="revenue-day-row">
													<span>Нал:</span>
													<span>{formatCurrency(rev.cash)}</span>
												</div>
												<div className="revenue-day-row">
													<span>Карта:</span>
													<span>{formatCurrency(rev.card)}</span>
												</div>
												<div className="revenue-day-row revenue-day-row-total">
													<span>Итого:</span>
													<span>{formatCurrency(rev.cash + rev.card)}</span>
												</div>
											</>
										)}
										{daySalesTotal > 0 && (
											<div className="revenue-day-row revenue-day-row-sportpit">
												<span><Dumbbell size={10} /> Спортпит:</span>
												<span>{formatCurrency(daySalesTotal)}</span>
											</div>
										)}
										{dayExpenseTotal > 0 && (
											<div className="revenue-day-row revenue-day-row-expense">
												<span><TrendingDown size={10} /> Расход:</span>
												<span>{formatCurrency(dayExpenseTotal)}</span>
											</div>
										)}
										{rev?.createdBy && (
											<div className="revenue-day-author">
												<UserIcon size={10} />
												<span>{rev.createdBy.name}</span>
											</div>
										)}
									</div>
								) : (
									<div className="revenue-day-no-data">
										<span>Нет данных</span>
									</div>
								)}
							</button>
						);
					})}
				</div>
			)}

			{selectedDay && (
				<div className="modal-overlay" onClick={closeModal}>
					<div className="modal-content revenue-day-modal" onClick={(e) => e.stopPropagation()}>
						<h3>{formatDayLabel(selectedDay)}</h3>

						{/* === ВЫРУЧКА === */}
						<div className="revenue-modal-section">
							<h4 className="revenue-modal-section-title">Выручка</h4>

							{editingRevenue && (
								<div className="revenue-modal-meta">
									{editingRevenue.createdBy && (
										<div className="revenue-modal-meta-row">
											<UserIcon size={14} />
											<span>Записал: <strong>{editingRevenue.createdBy.name}</strong></span>
										</div>
									)}
									{editingRevenue.updatedBy && editingRevenue.updatedAt && (
										<div className="revenue-modal-meta-row revenue-modal-meta-updated">
											<Edit2 size={14} />
											<span>
												Изменил: <strong>{editingRevenue.updatedBy.name}</strong>
												{' '}({new Date(editingRevenue.updatedAt).toLocaleString('ru-RU')})
											</span>
										</div>
									)}
								</div>
							)}

							{canEdit(editingRevenue) ? (
								<>
									<div className="revenue-modal-field">
										<label>Наличные</label>
										<input
											type="number"
											value={cashInput}
											onChange={(e) => setCashInput(e.target.value)}
											placeholder="0"
											min="0"
											step="any"
											autoFocus
										/>
									</div>
									<div className="revenue-modal-field">
										<label>Карта</label>
										<input
											type="number"
											value={cardInput}
											onChange={(e) => setCardInput(e.target.value)}
											placeholder="0"
											min="0"
											step="any"
										/>
									</div>

									{(cashInput || cardInput) && (
										<div className="revenue-modal-total">
											Итого: {formatCurrency((parseFloat(cashInput) || 0) + (parseFloat(cardInput) || 0))}
										</div>
									)}

									<div className="revenue-modal-actions">
										<button
											className="revenue-modal-save"
											onClick={handleSave}
											disabled={createMutation.isPending || updateMutation.isPending}
										>
											{createMutation.isPending || updateMutation.isPending
												? 'Сохранение...'
												: editingRevenue ? 'Обновить выручку' : 'Сохранить выручку'}
										</button>
									</div>
								</>
							) : (
								<>
									<div className="revenue-modal-readonly">
										<div className="revenue-modal-readonly-row">
											<span>Наличные:</span>
											<span>{formatCurrency(editingRevenue?.cash || 0)}</span>
										</div>
										<div className="revenue-modal-readonly-row">
											<span>Карта:</span>
											<span>{formatCurrency(editingRevenue?.card || 0)}</span>
										</div>
										<div className="revenue-modal-readonly-row revenue-modal-readonly-total">
											<span>Итого:</span>
											<span>{formatCurrency((editingRevenue?.cash || 0) + (editingRevenue?.card || 0))}</span>
										</div>
									</div>
									<p className="revenue-modal-no-permission">
										Редактировать может только автор записи или администратор
									</p>
								</>
							)}
						</div>

						<div className="revenue-modal-section revenue-modal-sportpit-section">
							<h4 className="revenue-modal-section-title">
								<Dumbbell size={16} />
								Продажи спортпита
								{selectedDaySales.length > 0 && (
									<span className="revenue-modal-sportpit-count">{selectedDaySales.length}</span>
								)}
							</h4>
							{selectedDaySales.length > 0 ? (
								<>
									<div className="revenue-modal-sales-list">
										{selectedDaySales.map((sale) => (
											<div key={sale.id} className="revenue-modal-sale-item">
												<div className="revenue-modal-sale-info">
													<span className="revenue-modal-sale-name">{sale.product?.name}</span>
													<span className="revenue-modal-sale-qty">{sale.quantity} шт × {formatCurrency(sale.price)}</span>
												</div>
												<span className="revenue-modal-sale-total">{formatCurrency(sale.total)}</span>
											</div>
										))}
									</div>
									<div className="revenue-modal-sales-total">
										<span>Итого спортпит:</span>
										<span>{formatCurrency(selectedDaySalesTotal)}</span>
									</div>
								</>
							) : (
								<p className="revenue-modal-no-sales">Нет продаж спортпита за этот день</p>
							)}
						</div>

						{/* === РАСХОДЫ === */}
						<div className="revenue-modal-section revenue-modal-expenses-section">
							<h4 className="revenue-modal-section-title">
								<TrendingDown size={16} />
								Расходы за день
								{selectedDayExpenses.length > 0 && (
									<span className="revenue-modal-expense-count">{selectedDayExpenses.length}</span>
								)}
							</h4>

							{selectedDayExpenses.length > 0 ? (
								<>
									<div className="revenue-modal-expenses-list">
										{selectedDayExpenses.map((exp) => (
											<div key={exp.id} className="revenue-modal-expense-item">
												<span className="revenue-modal-expense-amount">
													{formatCurrency(exp.amount)}
												</span>
												<span className="revenue-modal-expense-desc">
													{exp.description}
												</span>
											</div>
										))}
									</div>
									<div className="revenue-modal-expenses-total">
										<span>Итого расход:</span>
										<span>{formatCurrency(selectedDayExpenseTotal)}</span>
									</div>
								</>
							) : (
								<p className="revenue-modal-no-expenses">Нет расходов за этот день</p>
							)}
						</div>

						{/* Кнопка закрытия */}
						<div className="revenue-modal-actions">
							<button className="revenue-modal-cancel" onClick={closeModal}>
								Закрыть
							</button>
						</div>

						{(createMutation.isError || updateMutation.isError) && (
							<p className="revenue-modal-error">
								{(createMutation.error as any)?.message || (updateMutation.error as any)?.message || 'Ошибка сохранения'}
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
