import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	children: ReactNode;
	loading?: boolean;
}

export function Button({
	variant = 'primary',
	size = 'md',
	children,
	loading = false,
	disabled,
	className = '',
	...props
}: ButtonProps) {
	return (
		<button
			className={`btn btn-${variant} btn-${size} ${className}`}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? 'Загрузка...' : children}
		</button>
	);
}
