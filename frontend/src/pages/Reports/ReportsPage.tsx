import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import './ReportsPage.css';

export function ReportsPage() {
	return (
		<div className="reports-page">
			<h1>Отчеты</h1>

			<div className="reports-grid">
				<Card title="Дневной отчет">
					<p>Просмотр дневной статистики по бару</p>
					<Link to="/reports/daily">
						<Button variant="primary">Открыть</Button>
					</Link>
				</Card>

				<Card title="Месячный отчет">
					<p>Просмотр месячной статистики по бару</p>
					<Link to="/reports/monthly">
						<Button variant="primary">Открыть</Button>
					</Link>
				</Card>

				<Card title="Отчет за период">
					<p>Просмотр статистики за выбранный период</p>
					<Link to="/reports/period">
						<Button variant="primary">Открыть</Button>
					</Link>
				</Card>
			</div>
		</div>
	);
}
