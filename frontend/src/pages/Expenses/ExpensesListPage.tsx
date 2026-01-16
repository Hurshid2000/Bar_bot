import { useQuery } from '@tanstack/react-query';
import { expensesApi } from '../../api/expenses.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './ExpensesListPage.css';

export function ExpensesListPage() {
	const { data, isLoading } = useQuery({
		queryKey: ['expenses'],
		queryFn: () => expensesApi.getAll({ page: 1, limit: 50 }),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="expenses-list-page">
			<div className="page-header">
				<h1>Расходы</h1>
				<Button variant="primary">Добавить расход</Button>
			</div>

			{data && data.data.length > 0 ? (
				<div className="expenses-list">
					{data.data.map((expense) => (
						<Card key={expense.id}>
							<div className="expense-info">
								<p>
									<strong>Сумма:</strong> {formatCurrency(expense.amount)}
								</p>
								<p>
									<strong>Описание:</strong> {expense.description}
								</p>
								<p>
									<strong>Дата:</strong> {formatDate(expense.createdAt)}
								</p>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Расходы не найдены</p>
				</Card>
			)}
		</div>
	);
}
