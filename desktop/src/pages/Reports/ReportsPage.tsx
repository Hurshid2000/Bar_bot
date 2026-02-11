import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types/common.types';
import './ReportsPage.css';

export function ReportsPage() {
	const { hasRole } = useAuth();
	const isAdmin = hasRole([RoleType.ADMIN]);
	const isManager = hasRole([RoleType.MANAGER]) || isAdmin;

	return (
		<div className="reports-page">
			<h1>Отчеты</h1>

			<div className="reports-grid">
				{isManager && (
					<Card title="Проверка кассы">
						<p>Отчет проверки кассы между двумя инвентаризациями</p>
						<Link to="/reports/cash-audit">
							<Button variant="primary">Открыть</Button>
						</Link>
					</Card>
				)}

				{isManager && (
					<Card title="Отчет по спортпиту">
						<p>Выручка, прибыль и количество проданного спортпита за период</p>
						<Link to="/reports/sportpit">
							<Button variant="primary">Открыть</Button>
						</Link>
					</Card>
				)}

				{isAdmin && (
					<>
						<Card title="Расчет прибыли">
							<p>Отчет расчета прибыли между двумя инвентаризациями</p>
							<Link to="/reports/profit">
								<Button variant="primary">Открыть</Button>
							</Link>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}
