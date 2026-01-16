import type { ReactNode, HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	title?: string;
	actions?: ReactNode;
}

export function Card({ children, title, actions, className = '', ...props }: CardProps) {
	return (
		<div className={`card ${className}`} {...props}>
			{(title || actions) && (
				<div className="card-header">
					{title && <h3 className="card-title">{title}</h3>}
					{actions && <div className="card-actions">{actions}</div>}
				</div>
			)}
			<div className="card-body">{children}</div>
		</div>
	);
}
