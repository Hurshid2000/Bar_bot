import { ChevronRight, Banknote, CreditCard, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import './BarCard.css';

interface BarCardProps {
	id: string;
	name: string;
	monthlyCash: number;
	monthlyCard: number;
	monthlyExpenses: number;
	onClick: (id: string) => void;
}

export function BarCard({
	id,
	name,
	monthlyCash,
	monthlyCard,
	monthlyExpenses,
	onClick,
}: BarCardProps) {
	const totalRevenue = monthlyCash + monthlyCard;

	return (
		<button
			onClick={() => onClick(id)}
			className="bar-card"
		>
			<div className="bar-card-header">
				<div className="bar-card-title-section">
					<h3 className="bar-card-title">{name}</h3>
				</div>
				<ChevronRight className="bar-card-arrow" />
			</div>

			<div className="bar-card-metrics">
				<div className="bar-card-metric">
					<div className="bar-card-metric-value revenue">
						{formatCurrency(monthlyCash)}
					</div>
					<div className="bar-card-metric-label">
						<Banknote className="bar-card-icon" />
						<span>Наличка</span>
					</div>
				</div>

				<div className="bar-card-metric">
					<div className="bar-card-metric-value revenue">
						{formatCurrency(monthlyCard)}
					</div>
					<div className="bar-card-metric-label">
						<CreditCard className="bar-card-icon" />
						<span>Карта</span>
					</div>
				</div>

				<div className="bar-card-divider" />

				<div className="bar-card-metric">
					<div className="bar-card-metric-value expense">
						{formatCurrency(monthlyExpenses)}
					</div>
					<div className="bar-card-metric-label">
						<TrendingDown className="bar-card-icon" />
						<span>Расход</span>
					</div>
				</div>
			</div>

			<div className="bar-card-total">
				<span className="bar-card-total-label">Касса за месяц:</span>
				<span className="bar-card-total-value">{formatCurrency(totalRevenue)}</span>
			</div>
		</button>
	);
}
