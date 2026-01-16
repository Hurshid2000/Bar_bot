import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { barsApi } from '../../api/bars.api';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { formatDate } from '../../utils/format';
import './BarDetailPage.css';

export function BarDetailPage() {
	const { id } = useParams<{ id: string }>();

	const { data: bar, isLoading } = useQuery({
		queryKey: ['bars', id],
		queryFn: () => barsApi.getById(id!),
		enabled: !!id,
	});

	if (isLoading) {
		return <Loading />;
	}

	if (!bar) {
		return (
			<div>
				<Card>
					<p>Бар не найден</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="bar-detail-page">
			<h1>{bar.name}</h1>
			<Card>
				<div className="bar-detail-info">
					<p>
						<strong>ID:</strong> {bar.id}
					</p>
					<p>
						<strong>Статус:</strong>{' '}
						{bar.isActive ? 'Активен' : 'Неактивен'}
					</p>
					<p>
						<strong>Создан:</strong> {formatDate(bar.createdAt)}
					</p>
				</div>
			</Card>
		</div>
	);
}
