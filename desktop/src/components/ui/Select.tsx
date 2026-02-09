import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import './Select.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label?: string;
	error?: string;
	options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
	({ label, error, options, className = '', ...props }, ref) => {
		return (
			<div className="select-wrapper">
				{label && <label className="select-label">{label}</label>}
				<select
					ref={ref}
					className={`select ${error ? 'select-error' : ''} ${className}`}
					{...props}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				{error && <span className="select-error-message">{error}</span>}
			</div>
		);
	},
);

Select.displayName = 'Select';
