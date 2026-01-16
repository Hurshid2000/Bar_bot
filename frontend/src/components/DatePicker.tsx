import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Modal } from './ui/Modal';
import './DatePicker.css';

interface DatePickerProps {
	selectedDate: Date;
	onDateChange: (date: Date) => void;
}

export function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [tempDate, setTempDate] = useState(selectedDate);

	const handleConfirm = () => {
		onDateChange(tempDate);
		setIsOpen(false);
	};

	const handleCancel = () => {
		setTempDate(selectedDate);
		setIsOpen(false);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="date-picker-button"
			>
				<Calendar className="date-picker-icon" />
				<span>{format(selectedDate, 'dd.MM.yyyy')}</span>
			</button>

			<Modal isOpen={isOpen} onClose={handleCancel} title="Выберите дату">
				<div className="date-picker-content">
					<input
						type="date"
						value={format(tempDate, 'yyyy-MM-dd')}
						onChange={(e) => {
							if (e.target.value) {
								setTempDate(new Date(e.target.value));
							}
						}}
						className="date-picker-input"
					/>
					<div className="date-picker-actions">
						<button
							type="button"
							onClick={handleCancel}
							className="date-picker-cancel"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleConfirm}
							className="date-picker-confirm"
						>
							Выбрать
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
