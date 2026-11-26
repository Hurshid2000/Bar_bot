import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { arrivalsApi } from '../../api/arrivals.api';
import type { ArrivalDelivery } from '../../api/arrivals.api';
import { useBar } from '../../context/BarContext';
import { Loading } from '../../components/ui/Loading';
import { ArrivalType } from '../../types/common.types';
import './ArrivalsSummaryPage.css';

type SummaryType = 'ARRIVAL' | 'WRITE_OFF';
type Preset = 'today' | 'week' | 'month' | 'custom';

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presetRange(preset: Preset, cur: { start: string; end: string }) {
	const today = new Date();
	const end = toYMD(today);
	if (preset === 'today') return { start: end, end };
	if (preset === 'week') {
		const s = new Date();
		s.setDate(s.getDate() - 6);
		return { start: toYMD(s), end };
	}
	if (preset === 'month') {
		const s = new Date(today.getFullYear(), today.getMonth(), 1);
		return { start: toYMD(s), end };
	}
	return cur;
}

const fmtMoney = (n: number) => n.toLocaleString('ru-RU');
const fmtTime = (iso: string) => {
	const d = new Date(iso);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayKey = (iso: string) => toYMD(new Date(iso));
const dayLabel = (iso: string) =>
	new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDate = (ymd: string) => {
	if (!ymd) return '';
	const [y, m, d] = ymd.split('-');
	return `${d}.${m}.${y}`;
};

function deliveryLabel(d: ArrivalDelivery): string {
	if (d.source === 'purchase') return 'Закуп';
	if (d.type === 'WRITE_OFF') return 'Списание';
	if (d.items.some((i) => i.productType === 'SPORT_PIT')) return 'Приход спортпита';
	return 'Приход';
}

const PRESET_LABEL: Record<Preset, string> = {
	today: 'сегодня',
	week: 'неделю',
	month: 'месяц',
	custom: 'период',
};

export function ArrivalsSummaryPage() {
	const navigate = useNavigate();
	const { selectedBar } = useBar();

	const [type, setType] = useState<SummaryType>(ArrivalType.ARRIVAL);
	const [preset, setPreset] = useState<Preset>('month');
	const initRange = presetRange('month', { start: '', end: '' });
	const [startDate, setStartDate] = useState(initRange.start);
	const [endDate, setEndDate] = useState(initRange.end);
	const [search, setSearch] = useState('');
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [showProducts, setShowProducts] = useState(false);

	const applyPreset = (p: Preset) => {
		setPreset(p);
		if (p !== 'custom') {
			const r = presetRange(p, { start: startDate, end: endDate });
			setStartDate(r.start);
			setEndDate(r.end);
		}
	};

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

	const deliveries = useMemo(() => {
		const list = data?.deliveries ?? [];
		if (!search.trim()) return list;
		const q = search.toLowerCase().trim();
		return list.filter((d) => d.items.some((i) => i.productName.toLowerCase().includes(q)));
	}, [data, search]);

	const items = useMemo(() => {
		const list = data?.items ?? [];
		if (!search.trim()) return list;
		const q = search.toLowerCase().trim();
		return list.filter((i) => i.productName.toLowerCase().includes(q));
	}, [data, search]);

	const periodTotal = useMemo(
		() => deliveries.reduce((s, d) => s + d.totalAmount, 0),
		[deliveries],
	);
	const totalQty = useMemo(() => items.reduce((s, i) => s + i.totalQuantity, 0), [items]);

	const groups = useMemo(() => {
		const map = new Map<
			string,
			{ key: string; label: string; total: number; list: ArrivalDelivery[] }
		>();
		for (const d of deliveries) {
			const k = dayKey(d.date);
			let g = map.get(k);
			if (!g) {
				g = { key: k, label: dayLabel(d.date), total: 0, list: [] };
				map.set(k, g);
			}
			g.total += d.totalAmount;
			g.list.push(d);
		}
		return Array.from(map.values());
	}, [deliveries]);

	const isArrival = type === ArrivalType.ARRIVAL;
	const sign = isArrival ? '+' : '−';
	const amountClass = isArrival ? 'pm-pos' : 'pm-neg';

	return (
		<div className="pm-page">
			<div className="pm-header">
				<button className="pm-back" onClick={() => navigate('/orders?mode=arrival')} aria-label="Назад">
					<ArrowLeft size={22} />
				</button>
				<h1 className="pm-title">Мониторинг</h1>
			</div>

			<div className="pm-chips">
				<button
					className={`pm-chip ${isArrival ? 'pm-chip-active' : ''}`}
					onClick={() => setType(ArrivalType.ARRIVAL)}
				>
					Приход
				</button>
				<button
					className={`pm-chip ${!isArrival ? 'pm-chip-active' : ''}`}
					onClick={() => setType(ArrivalType.WRITE_OFF)}
				>
					Списание
				</button>
			</div>

			<div className="pm-chips pm-chips-scroll">
				{(['today', 'week', 'month', 'custom'] as Preset[]).map((p) => (
					<button
						key={p}
						className={`pm-chip ${preset === p ? 'pm-chip-active' : ''}`}
						onClick={() => applyPreset(p)}
					>
						{p === 'today' ? 'Сегодня' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Период'}
					</button>
				))}
			</div>

			{preset === 'custom' && (
				<div className="pm-dates">
					<label>
						<span>С</span>
						<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
					</label>
					<label>
						<span>По</span>
						<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
					</label>
				</div>
			)}

			<input
				className="pm-search"
				placeholder="Поиск по названию товара"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			<button className="pm-total" onClick={() => setShowProducts(true)} disabled={!items.length}>
				<div className="pm-total-head">
					<span className="pm-total-label">
						{isArrival ? 'Приходы' : 'Списания'} за {PRESET_LABEL[preset]}
					</span>
					{!!items.length && <span className="pm-total-more">по товарам</span>}
				</div>
				<div className={`pm-total-amount ${amountClass}`}>
					{sign}
					{fmtMoney(periodTotal)} сум
				</div>
				<div className="pm-total-sub">
					{deliveries.length} поставок · {items.length} позиций · {fmtMoney(totalQty)} шт.
				</div>
			</button>

			{isLoading ? (
				<Loading />
			) : error ? (
				<div className="pm-empty">Ошибка загрузки данных</div>
			) : groups.length === 0 ? (
				<div className="pm-empty">За выбранный период {isArrival ? 'приходов' : 'списаний'} нет</div>
			) : (
				<div className="pm-list">
					{groups.map((g) => (
						<div key={g.key} className="pm-group">
							<div className="pm-group-head">
								<span className="pm-group-date">{g.label}</span>
								<span className={`pm-group-total ${amountClass}`}>
									{sign}
									{fmtMoney(g.total)} сум
								</span>
							</div>
							{g.list.map((d) => {
								const id = `${d.source}-${d.id}`;
								const open = expandedId === id;
								return (
									<div key={id} className={`pm-tx ${open ? 'pm-tx-open' : ''}`}>
										<button
											className="pm-tx-row"
											onClick={() => setExpandedId(open ? null : id)}
										>
											<span className={`pm-tx-icon ${isArrival ? 'pm-tx-in' : 'pm-tx-out'}`}>
												{isArrival ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
											</span>
											<span className="pm-tx-main">
												<span className="pm-tx-title">{deliveryLabel(d)}</span>
												<span className="pm-tx-meta">
													{d.itemsCount} поз. · {fmtTime(d.date)}
												</span>
											</span>
											<span className="pm-tx-right">
												<span className={`pm-tx-amount ${amountClass}`}>
													{sign}
													{fmtMoney(d.totalAmount)} сум
												</span>
												<ChevronDown size={16} className={`pm-tx-caret ${open ? 'pm-open' : ''}`} />
											</span>
										</button>
										{open && (
											<div className="pm-tx-items">
												{d.items.map((it, idx) => (
													<div key={`${it.productId}-${idx}`} className="pm-tx-item">
														<span className="pm-tx-item-name">{it.productName}</span>
														<span className="pm-tx-item-calc">
															{fmtMoney(it.quantity)} × {fmtMoney(it.price)} = {fmtMoney(it.amount)} сум
														</span>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
			)}

			{showProducts && (
				<div className="pm-modal-overlay" onClick={() => setShowProducts(false)}>
					<div className="pm-modal" onClick={(e) => e.stopPropagation()}>
						<div className="pm-modal-head">
							<div className="pm-modal-head-text">
								<div className="pm-modal-title">
									{isArrival ? 'Приходы' : 'Списания'} за {PRESET_LABEL[preset]} — по товарам
								</div>
								<div className="pm-modal-sub">
									{fmtDate(startDate)} – {fmtDate(endDate)}
								</div>
							</div>
							<button className="pm-modal-close" onClick={() => setShowProducts(false)} aria-label="Закрыть">
								<X size={20} />
							</button>
						</div>
						<div className={`pm-modal-total ${amountClass}`}>
							{sign}
							{fmtMoney(periodTotal)} сум
						</div>
						<div className="pm-modal-list">
							{items.map((it) => (
								<div key={it.productId} className="pm-modal-item">
									<div className="pm-modal-item-main">
										<span className="pm-modal-item-name">
											{it.productName}
											{it.productType === 'SPORT_PIT' && <span className="pm-tag">Спортпит</span>}
										</span>
										<span className="pm-modal-item-meta">{it.deliveriesCount} поставок</span>
									</div>
									<div className="pm-modal-item-numbers">
										<span className="pm-modal-item-qty">{fmtMoney(it.totalQuantity)} шт.</span>
										<span className="pm-modal-item-sum">{fmtMoney(it.totalAmount)} сум</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
