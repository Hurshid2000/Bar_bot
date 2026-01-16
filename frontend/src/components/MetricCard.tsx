import type { ReactNode } from 'react';
import './MetricCard.css';

interface MetricCardProps {
	title: string;
	value: string | number | ReactNode;
	icon?: ReactNode;
	onClick?: () => void;
	className?: string;
}

export function MetricCard({
	title,
	value,
	icon,
	onClick,
	className = '',
}: MetricCardProps) {
	const Component = onClick ? 'button' : 'div';

	return (
		<Component
			className={`metric-card ${onClick ? 'metric-card-clickable' : ''} ${className}`}
			onClick={onClick}
		>
			{icon && <div className="metric-card-icon">{icon}</div>}
			<div className="metric-card-content">
				<div className="metric-card-value">{value}</div>
				<div className="metric-card-title">{title}</div>
			</div>
		</Component>
	);
}
