import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
	({ label, error, className = '', ...props }, ref) => {
		return (
			<div className="input-wrapper">
				{label && <label className="input-label">{label}</label>}
				<input
					ref={ref}
					className={`input ${error ? 'input-error' : ''} ${className}`}
					{...props}
				/>
				{error && <span className="input-error-message">{error}</span>}
			</div>
		);
	},
);

Input.displayName = 'Input';
