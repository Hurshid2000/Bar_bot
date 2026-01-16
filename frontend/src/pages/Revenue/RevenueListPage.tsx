import { useQuery } from '@tanstack/react-query';
import { revenueApi } from '../../api/revenue.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency, formatDate } from '../../utils/format';
import './RevenueListPage.css';

export function RevenueListPage() {
	const { data, isLoading } = useQuery({
		queryKey: ['revenue'],
		queryFn: () => revenueApi.getAll({ page: 1, limit: 50 }),
	});

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="revenue-list-page">
			<div className="page-header">
				<h1>Выручка</h1>
				<Button variant="primary">Добавить выручку</Button>
			</div>

			{data && data.data.length > 0 ? (
				<div className="revenue-list">
					{data.data.map((revenue) => (
						<Card key={revenue.id}>
							<div className="revenue-info">
								<p>
									<strong>Дата:</strong> {formatDate(revenue.date)}
								</p>
								<p>
									<strong>Наличные:</strong> {formatCurrency(revenue.cash)}
								</p>
								<p>
									<strong>Карта:</strong> {formatCurrency(revenue.card)}
								</p>
								<p>
									<strong>Итого:</strong>{' '}
									{formatCurrency(revenue.cash + revenue.card)}
								</p>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p>Записи выручки не найдены</p>
				</Card>
			)}
		</div>
	);
}
