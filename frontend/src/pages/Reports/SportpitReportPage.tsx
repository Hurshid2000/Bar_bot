import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../context/AuthContext';
import { useBar } from '../../context/BarContext';
import { barsApi } from '../../api/bars.api';
import { salesApi } from '../../api/sales.api';
import { formatCurrency } from '../../utils/format';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import './SportpitReportPage.css';

export function SportpitReportPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { selectedBar } = useBar();

	const now = new Date();
	const [barId, setBarId] = useState<string>('');
	const [startDate, setStartDate] = useState(() =>
		format(startOfMonth(now), 'yyyy-MM-dd'),
	);
	const [endDate, setEndDate] = useState(() =>
		format(endOfMonth(now), 'yyyy-MM-dd'),
	);

	// Pre-fill bar for managers
	useEffect(() => {
		if (selectedBar && !barId) {
			setBarId(selectedBar.id);
		}
	}, [selectedBar, barId]);

	const { data: bars, isLoading: barsLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: !!user,
	});

	const { data: report, isLoading: reportLoading } = useQuery({
		queryKey: ['sportpit-report', barId, startDate, endDate],
		queryFn: () =>
			salesApi.getSportpitReport(barId, startDate, endDate),
		enabled: !!barId && !!startDate && !!endDate,
	});

	const barOptions =
		bars?.map((bar) => ({ value: bar.id, label: bar.name })) || [];

	const barName = bars?.find((b) => b.id === barId)?.name ?? '';

	if (barsLoading) {
		return <Loading />;
	}

	const profitIsPositive = report && report.totalProfit > 0;
	const profitIsNegative = report && report.totalProfit < 0;

	return (
		<div className="sportpit-report-page">
			<div className="page-header">
				<Button
					variant="ghost"
					onClick={() => navigate('/reports')}
					className="back-button"
				>
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1>Отчет по спортпиту</h1>
			</div>

			<Card title="Параметры отчета">
				<div className="report-filters">
					<Select
						label="Бар"
						value={barId}
						onChange={(e) => setBarId(e.target.value)}
						options={[
							{ value: '', label: 'Выберите бар' },
							...barOptions,
						]}
					/>
					<div className="report-date-row">
						<div className="report-date-field">
							<label>Начало периода</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<div className="report-date-field">
							<label>Конец периода</label>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</Card>

			{reportLoading && <Loading />}

			{report && (
				<>
					<Card
						title={barName}
						className="report-card"
					>
						<div className="report-header">
							<div className="report-summary-row">
								<div className="report-summary-item">
									<span className="summary-label">Выручка:</span>
									<span className="summary-value summary-revenue">
										{formatCurrency(report.totalRevenue)}
									</span>
								</div>
								<div className="report-summary-item">
									<span className="summary-label">Себестоимость:</span>
									<span className="summary-value summary-cost">
										{formatCurrency(report.totalCost)}
									</span>
								</div>
								<div className="report-summary-item">
									<span className="summary-label">Прибыль:</span>
									<div className="report-profit">
										{profitIsPositive && (
											<TrendingUp className="profit-icon profit-positive" />
										)}
										{profitIsNegative && (
											<TrendingDown className="profit-icon profit-negative" />
										)}
										<span
											className={`summary-value summary-profit ${
												profitIsPositive
													? 'profit-positive'
													: profitIsNegative
														? 'profit-negative'
														: ''
											}`}
										>
											{formatCurrency(report.totalProfit)}
										</span>
									</div>
								</div>
							</div>
						</div>
						<p className="report-period">
							{format(new Date(startDate), 'dd.MM.yyyy')} —{' '}
							{format(new Date(endDate), 'dd.MM.yyyy')}
						</p>
					</Card>

					<Card title="Продажи по продуктам" className="report-table-card">
						{report.items.length === 0 ? (
							<p className="report-empty">Нет продаж спортпита за период</p>
						) : (
							<div className="sportpit-report-table-wrap">
								<table className="sportpit-report-table">
									<thead>
										<tr>
											<th>Продукт</th>
											<th>Категория</th>
											<th className="num">Кол-во</th>
											<th className="num">Выручка</th>
											<th className="num">Себ-ть</th>
											<th className="num">Прибыль</th>
										</tr>
									</thead>
									<tbody>
										{report.items.map((item) => (
											<tr key={item.productId}>
												<td>{item.productName}</td>
												<td>{item.categoryName || '—'}</td>
												<td className="num">{item.quantity}</td>
												<td className="num">
													{formatCurrency(item.revenue)}
												</td>
												<td className="num">
													{formatCurrency(item.cost)}
												</td>
												<td
													className={`num ${
														item.profit >= 0 ? 'profit-positive' : 'profit-negative'
													}`}
												>
													{formatCurrency(item.profit)}
												</td>
											</tr>
										))}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={2} className="footer-label">
												Итого
											</td>
											<td className="num">
												{report.items.reduce((a, i) => a + i.quantity, 0)}
											</td>
											<td className="num">
												{formatCurrency(report.totalRevenue)}
											</td>
											<td className="num">
												{formatCurrency(report.totalCost)}
											</td>
											<td
												className={`num ${
													report.totalProfit >= 0
														? 'profit-positive'
														: 'profit-negative'
												}`}
											>
												{formatCurrency(report.totalProfit)}
											</td>
										</tr>
									</tfoot>
								</table>
							</div>
						)}
					</Card>
				</>
			)}
		</div>
	);
}
