import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../context/AuthContext';
import { barsApi } from '../../api/bars.api';
import { reportsApi, type Inventory } from '../../api/reports.api';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import './CashAuditReportPage.css';

export function CashAuditReportPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [barId, setBarId] = useState<string>('');
	const [startInventoryId, setStartInventoryId] = useState<string>('');
	const [endInventoryId, setEndInventoryId] = useState<string>('');

	// Загружаем список баров
	const { data: bars, isLoading: barsLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: !!user,
	});

	// Загружаем список инвентаризаций для выбранного бара
	const { data: inventories, isLoading: inventoriesLoading } = useQuery({
		queryKey: ['inventories', barId],
		queryFn: () => reportsApi.getInventories(barId),
		enabled: !!barId,
	});

	// Загружаем отчет
	const { data: report, isLoading: reportLoading } = useQuery({
		queryKey: ['cash-audit-report', barId, startInventoryId, endInventoryId],
		queryFn: () =>
			reportsApi.getCashAuditReport(barId, startInventoryId, endInventoryId),
		enabled: !!barId && !!startInventoryId && !!endInventoryId,
	});

	const barOptions =
		bars?.map((bar) => ({ value: bar.id, label: bar.name })) || [];

	const inventoryOptions: Array<{ value: string; label: string }> =
		inventories?.map((inv: Inventory) => ({
			value: inv.id,
			label: `${format(new Date(inv.createdAt), 'dd.MM.yyyy')} - ${formatCurrency(inv.totalAmount)}${inv.comment ? ` (${inv.comment})` : ''}`,
		})) || [];

	const canGenerateReport =
		barId && startInventoryId && endInventoryId && startInventoryId !== endInventoryId;

	const getStatusIcon = () => {
		if (!report) return null;
		switch (report.status) {
			case 'ok':
				return <CheckCircle className="status-icon status-ok" />;
			case 'surplus':
				return <AlertCircle className="status-icon status-surplus" />;
			case 'shortage':
				return <XCircle className="status-icon status-shortage" />;
		}
	};

	const getStatusText = () => {
		if (!report) return '';
		switch (report.status) {
			case 'ok':
				return 'Баланс в норме';
			case 'surplus':
				return 'Излишек';
			case 'shortage':
				return 'Недостача';
		}
	};

	if (barsLoading) {
		return <Loading />;
	}

	return (
		<div className="cash-audit-report-page">
			<div className="page-header">
				<Button
					variant="ghost"
					onClick={() => navigate('/reports')}
					className="back-button"
				>
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1>Проверка кассы</h1>
			</div>

			<Card title="Параметры отчета">
				<div className="report-filters">
					<Select
						label="Бар"
						value={barId}
						onChange={(e) => {
							setBarId(e.target.value);
							setStartInventoryId('');
							setEndInventoryId('');
						}}
						options={[
							{ value: '', label: 'Выберите бар' },
							...barOptions,
						]}
					/>

					{barId && (
						<>
							<Select
								label="Начальная инвентаризация"
								value={startInventoryId}
								onChange={(e) => setStartInventoryId(e.target.value)}
								options={[
									{ value: '', label: 'Выберите инвентаризацию' },
									...inventoryOptions,
								]}
								disabled={inventoriesLoading}
							/>

							<Select
								label="Конечная инвентаризация"
								value={endInventoryId}
								onChange={(e) => setEndInventoryId(e.target.value)}
								options={[
									{ value: '', label: 'Выберите инвентаризацию' },
									...inventoryOptions.filter(
										(opt) => opt.value !== startInventoryId,
									),
								]}
								disabled={inventoriesLoading}
							/>
						</>
					)}
				</div>
			</Card>

			{reportLoading && <Loading />}

			{report && (
				<>
					<Card
						title={`Отчет: ${report.barName}`}
						className={`report-card report-status-${report.status}`}
					>
						<div className="report-header">
							<div className="report-status">
								{getStatusIcon()}
								<span className="status-text">{getStatusText()}</span>
							</div>
							<div className="report-result">
								<span className="result-label">Итог:</span>
								<span
									className={`result-value result-${report.status}`}
								>
									{formatCurrency(report.result)}
								</span>
							</div>
						</div>

						<div className="report-period">
							<p>
								Период:{' '}
								{format(new Date(report.period.startDate), 'dd.MM.yyyy')} -{' '}
								{format(new Date(report.period.endDate), 'dd.MM.yyyy')}
							</p>
						</div>
					</Card>

					<Card title="Приходы">
						<div className="report-section">
							<div className="report-item">
								<span className="item-label">Выручка наличными:</span>
								<span className="item-value">
									{formatCurrency(report.incomes.revenueCash)}
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">Выручка картой:</span>
								<span className="item-value">
									{formatCurrency(report.incomes.revenueCard)}
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">Списания:</span>
								<span className="item-value">
									{formatCurrency(report.incomes.writeOffs)}
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">Долги клиентов:</span>
								<span className="item-value">
									{formatCurrency(report.incomes.clientDebts)}
								</span>
							</div>
							<div className="report-item report-total">
								<span className="item-label">Итого приходов:</span>
								<span className="item-value">
									{formatCurrency(
										report.incomes.revenueCash +
											report.incomes.revenueCard +
											report.incomes.writeOffs +
											report.incomes.clientDebts,
									)}
								</span>
							</div>
						</div>
					</Card>

					<Card title="Расходы">
						<div className="report-section">
							<div className="report-item">
								<span className="item-label">
									Закупки по цене продажи:
								</span>
								<span className="item-value">
									{formatCurrency(report.expenses.purchasesAtSalePrice)}
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">Депозиты клиентов:</span>
								<span className="item-value">
									{formatCurrency(report.expenses.clientDeposits)}
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">
									Предыдущая инвентаризация:
								</span>
								<span className="item-value">
									{formatCurrency(report.startInventoryAmount)}
								</span>
							</div>
							<div className="report-item report-total">
								<span className="item-label">Итого расходов:</span>
								<span className="item-value">
									{formatCurrency(
										report.expenses.purchasesAtSalePrice +
											report.expenses.clientDeposits +
											report.startInventoryAmount,
									)}
								</span>
							</div>
						</div>
					</Card>

					<Card title="Инвентаризации">
						<div className="report-section">
							<div className="report-item">
								<span className="item-label">Начальная инвентаризация:</span>
								<span className="item-value">
									{formatCurrency(report.startInventoryAmount)} (
									{format(new Date(report.startInventoryDate), 'dd.MM.yyyy')})
								</span>
							</div>
							<div className="report-item">
								<span className="item-label">Конечная инвентаризация:</span>
								<span className="item-value">
									{formatCurrency(report.endInventoryAmount)} (
									{format(new Date(report.endInventoryDate), 'dd.MM.yyyy')})
								</span>
							</div>
						</div>
					</Card>
				</>
			)}
		</div>
	);
}
