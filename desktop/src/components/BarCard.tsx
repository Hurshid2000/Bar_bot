import { ChevronRight, Banknote, CreditCard, TrendingDown, Wallet } from 'lucide-react';
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
				<h3 className="bar-card-title">{name}</h3>
				<ChevronRight className="bar-card-arrow" />
			</div>

			<div className="bar-card-body">
				<div className="bar-card-left">
					<div className="bar-card-row">
						<Banknote className="bar-card-icon" />
						<span className="bar-card-row-label">Наличка</span>
						<span className="bar-card-row-value revenue">{formatCurrency(monthlyCash)}</span>
					</div>
					<div className="bar-card-row">
						<CreditCard className="bar-card-icon" />
						<span className="bar-card-row-label">Карта</span>
						<span className="bar-card-row-value revenue">{formatCurrency(monthlyCard)}</span>
					</div>
					<div className="bar-card-row bar-card-row-total">
						<Wallet className="bar-card-icon" />
						<span className="bar-card-row-label">Итого</span>
						<span className="bar-card-row-value total">{formatCurrency(totalRevenue)}</span>
					</div>
				</div>

				<div className="bar-card-divider" />

				<div className="bar-card-right">
					<div className="bar-card-expense-value">{formatCurrency(monthlyExpenses)}</div>
					<div className="bar-card-expense-label">
						<TrendingDown className="bar-card-icon" />
						<span>Расход</span>
					</div>
				</div>
			</div>
		</button>
	);
}
