import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { arrivalsApi } from '../../api/arrivals.api';
import { useBar } from '../../context/BarContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { ArrivalType } from '../../types/common.types';
import './ArrivalsSummaryPage.css';

type SummaryType = 'ARRIVAL' | 'WRITE_OFF';

function getDefaultStartDate(): string {
	const d = new Date();
	d.setDate(d.getDate() - 30);
	return d.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
	return new Date().toISOString().split('T')[0];
}

export function ArrivalsSummaryPage() {
	const navigate = useNavigate();
	const { selectedBar } = useBar();

	const [type, setType] = useState<SummaryType>(ArrivalType.ARRIVAL);
	const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
	const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
	const [search, setSearch] = useState<string>('');

	const { data, isLoading, error } = useQuery({
		queryKey: ['arrivals', 'summary', selectedBar?.id, type, startDate, endDate],
		queryFn: () =>
			arrivalsApi.getSummary({
				barId: selectedBar?.id,
				type,
				startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
				endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
			}),
	});

	const filteredItems = useMemo(() => {
		if (!data?.items) return [];
		if (!search.trim()) return data.items;
		const q = search.toLowerCase().trim();
		return data.items.filter((item) => item.productName.toLowerCase().includes(q));
	}, [data, search]);

	const totalQuantity = useMemo(
		() => filteredItems.reduce((sum, item) => sum + item.totalQuantity, 0),
		[filteredItems],
	);

	const totalAmount = useMemo(
		() => filteredItems.reduce((sum, item) => sum + item.totalAmount, 0),
		[filteredItems],
	);

	return (
		<div className="arrivals-summary-page">
			<div className="arrivals-summary-header">
				<Button
					variant="ghost"
					onClick={() => navigate('/orders?mode=arrival')}
					className="arrivals-summary-back-btn"
				>
					<ArrowLeft size={20} />
					Назад
				</Button>
				<h1 className="arrivals-summary-title">Сводка приходов</h1>
			</div>

			<Card className="arrivals-summary-filters">
				<div className="arrivals-summary-type-toggle">
					<Button
						variant={type === ArrivalType.ARRIVAL ? 'primary' : 'outline'}
						size="md"
						onClick={() => setType(ArrivalType.ARRIVAL)}
					>
						Приход
					</Button>
					<Button
						variant={type === ArrivalType.WRITE_OFF ? 'primary' : 'outline'}
						size="md"
						onClick={() => setType(ArrivalType.WRITE_OFF)}
					>
						Списание
					</Button>
				</div>

				<div className="arrivals-summary-date-row">
					<div className="arrivals-summary-date-field">
						<label>С</label>
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="arrivals-summary-date-field">
						<label>По</label>
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>

				<input
					type="text"
					className="arrivals-summary-search"
					placeholder="Поиск по названию товара"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</Card>

			{isLoading ? (
				<Loading />
			) : error ? (
				<Card>
					<p>Ошибка загрузки данных</p>
				</Card>
			) : filteredItems.length === 0 ? (
				<Card>
					<p>За выбранный период {type === ArrivalType.ARRIVAL ? 'приходов' : 'списаний'} нет</p>
				</Card>
			) : (
				<>
					<Card className="arrivals-summary-totals">
						<div>
							<span className="arrivals-summary-totals-label">Поставок:</span>
							<span className="arrivals-summary-totals-value">{data?.totalDeliveries ?? 0}</span>
						</div>
						<div>
							<span className="arrivals-summary-totals-label">Позиций:</span>
							<span className="arrivals-summary-totals-value">{filteredItems.length}</span>
						</div>
						<div>
							<span className="arrivals-summary-totals-label">Всего шт.:</span>
							<span className="arrivals-summary-totals-value">{totalQuantity.toLocaleString('ru-RU')}</span>
						</div>
						<div>
							<span className="arrivals-summary-totals-label">Сумма:</span>
							<span className="arrivals-summary-totals-value">
								{totalAmount.toLocaleString('ru-RU')} сум
							</span>
						</div>
					</Card>

					<div className="arrivals-summary-list">
						{filteredItems.map((item) => (
							<Card key={item.productId} className="arrivals-summary-item">
								<div className="arrivals-summary-item-main">
									<h4 className="arrivals-summary-item-name">{item.productName}</h4>
									<p className="arrivals-summary-item-meta">
										{item.deliveriesCount} {item.deliveriesCount === 1 ? 'поставка' : 'поставок'}
										{item.productType === 'SPORT_PIT' && ' · Спортпит'}
									</p>
								</div>
								<div className="arrivals-summary-item-numbers">
									<div className="arrivals-summary-item-qty">
										{item.totalQuantity.toLocaleString('ru-RU')} шт.
									</div>
									<div className="arrivals-summary-item-amount">
										{item.totalAmount.toLocaleString('ru-RU')} сум
									</div>
								</div>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
}
