import { ChevronRight, TrendingUp, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import './BarCard.css';

interface BarCardProps {
	id: string;
	name: string;
	todayRevenue: number;
	todayOrders: number;
	onClick: (id: string) => void;
}

export function BarCard({
	id,
	name,
	todayRevenue,
	todayOrders,
	onClick,
}: BarCardProps) {
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
						{formatCurrency(todayRevenue)}
					</div>
					<div className="bar-card-metric-label">
						<TrendingUp className="bar-card-icon" />
						<span>Today revenue</span>
					</div>
				</div>

				<div className="bar-card-metric">
					<div className="bar-card-metric-value">{todayOrders}</div>
					<div className="bar-card-metric-label">
						<ShoppingBag className="bar-card-icon" />
						<span>Orders today</span>
					</div>
				</div>
			</div>
		</button>
	);
}
