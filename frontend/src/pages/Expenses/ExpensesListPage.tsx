import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { expensesApi } from '../../api/expenses.api';
import { useBar } from '../../context/BarContext';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import { RoleType, type Expense } from '../../types/common.types';
import './ExpensesListPage.css';

export function ExpensesListPage() {
	const { selectedBar } = useBar();
	const { hasRole } = useAuth();
	const queryClient = useQueryClient();
	const canManage = hasRole([RoleType.ADMIN, RoleType.MANAGER]);

	const [showForm, setShowForm] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [formAmount, setFormAmount] = useState('');
	const [formDescription, setFormDescription] = useState('');
	const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ['expenses', selectedBar?.id],
		queryFn: () => expensesApi.getAll({ barId: selectedBar?.id, page: 1, limit: 100 }),
		enabled: !!selectedBar,
	});

	const createMutation = useMutation({
		mutationFn: (dto: { barId: string; amount: number; description: string; date: string }) =>
			expensesApi.create(dto),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
			queryClient.invalidateQueries({ queryKey: ['bars', 'monthly-stats'] });
			resetForm();
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: { amount?: number; description?: string; date?: string } }) =>
			expensesApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
			queryClient.invalidateQueries({ queryKey: ['bars', 'monthly-stats'] });
			resetForm();
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => expensesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['expenses'] });
			queryClient.invalidateQueries({ queryKey: ['bars', 'monthly-stats'] });
			setConfirmDelete(null);
		},
	});

	const resetForm = () => {
		setShowForm(false);
		setEditingExpense(null);
		setFormAmount('');
		setFormDescription('');
		setFormDate(format(new Date(), 'yyyy-MM-dd'));
	};

	const openCreateForm = () => {
		resetForm();
		setShowForm(true);
	};

	const openEditForm = (expense: Expense) => {
		setEditingExpense(expense);
		setFormAmount(expense.amount.toString());
		setFormDescription(expense.description);
		setFormDate(format(new Date(expense.date), 'yyyy-MM-dd'));
		setShowForm(true);
	};

	const handleSubmit = () => {
		if (!selectedBar) return;
		const amount = parseFloat(formAmount);
		if (isNaN(amount) || amount <= 0 || !formDescription.trim()) return;

		if (editingExpense) {
			updateMutation.mutate({
				id: editingExpense.id,
				data: { amount, description: formDescription.trim(), date: formDate },
			});
		} else {
			createMutation.mutate({
				barId: selectedBar.id,
				amount,
				description: formDescription.trim(),
				date: formDate,
			});
		}
	};

	const formatExpenseDate = (dateStr: string) => {
		try {
			return format(new Date(dateStr), 'dd.MM.yyyy');
		} catch {
			return dateStr;
		}
	};

	if (!selectedBar) {
		return (
			<div className="expenses-list-page">
				<p className="expenses-no-bar">Выберите бар для просмотра расходов</p>
			</div>
		);
	}

	if (isLoading) return <Loading />;

	return (
		<div className="expenses-list-page">
			<div className="expenses-header">
				<h1 className="expenses-title">Расходы</h1>
				{canManage && (
					<button className="expenses-add-btn" onClick={openCreateForm}>
						<Plus size={18} />
						Добавить
					</button>
				)}
			</div>

			{showForm && (
				<div className="expense-form">
					<h3 className="expense-form-title">
						{editingExpense ? 'Редактировать расход' : 'Новый расход'}
					</h3>
					<div className="expense-form-fields">
						<div className="expense-form-row">
							<label>Дата</label>
							<input
								type="date"
								value={formDate}
								onChange={(e) => setFormDate(e.target.value)}
								className="expense-form-input"
							/>
						</div>
						<div className="expense-form-row">
							<label>Сумма</label>
							<input
								type="number"
								value={formAmount}
								onChange={(e) => setFormAmount(e.target.value)}
								placeholder="0"
								min="1"
								className="expense-form-input"
							/>
						</div>
						<div className="expense-form-row">
							<label>Описание</label>
							<input
								type="text"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="На что потрачено"
								className="expense-form-input"
							/>
						</div>
					</div>
					<div className="expense-form-actions">
						<button className="expense-form-cancel" onClick={resetForm}>Отмена</button>
						<button
							className="expense-form-submit"
							onClick={handleSubmit}
							disabled={!formAmount || parseFloat(formAmount) <= 0 || !formDescription.trim() || createMutation.isPending || updateMutation.isPending}
						>
							{editingExpense ? 'Сохранить' : 'Создать'}
						</button>
					</div>
				</div>
			)}

			{data && data.data.length > 0 ? (
				<div className="expenses-list">
					{data.data.map((expense) => (
						<div key={expense.id} className="expense-item">
							<div className="expense-item-left">
								<div className="expense-item-date">{formatExpenseDate(expense.date)}</div>
								<div className="expense-item-desc">{expense.description}</div>
							</div>
							<div className="expense-item-right">
								<div className="expense-item-amount">{formatCurrency(expense.amount)}</div>
								{canManage && (
									<div className="expense-item-actions">
										<button className="expense-action-btn" onClick={() => openEditForm(expense)} title="Редактировать">
											<Pencil size={14} />
										</button>
										{confirmDelete === expense.id ? (
											<button
												className="expense-action-btn expense-action-btn-danger-confirm"
												onClick={() => deleteMutation.mutate(expense.id)}
											>
												Да
											</button>
										) : (
											<button
												className="expense-action-btn expense-action-btn-danger"
												onClick={() => setConfirmDelete(expense.id)}
												title="Удалить"
											>
												<Trash2 size={14} />
											</button>
										)}
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="expenses-empty">
					<p>Расходы не найдены</p>
				</div>
			)}
		</div>
	);
}
