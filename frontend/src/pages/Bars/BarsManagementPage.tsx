import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { barsApi, type CreateBarDto, type UpdateBarDto } from '../../api/bars.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../utils/format';
import './BarsManagementPage.css';

export function BarsManagementPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingBar, setEditingBar] = useState<{ id: string; name: string; isActive: boolean } | null>(null);
	const [formData, setFormData] = useState({ name: '', isActive: true });

	const { data: bars, isLoading } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
	});

	const createMutation = useMutation({
		mutationFn: (data: CreateBarDto) => barsApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bars'] });
			setIsCreateModalOpen(false);
			setFormData({ name: '', isActive: true });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateBarDto }) =>
			barsApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bars'] });
			setEditingBar(null);
			setFormData({ name: '', isActive: true });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => barsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bars'] });
		},
	});

	const handleCreate = () => {
		setFormData({ name: '', isActive: true });
		setIsCreateModalOpen(true);
	};

	const handleEdit = (bar: { id: string; name: string; isActive: boolean }) => {
		setEditingBar(bar);
		setFormData({ name: bar.name, isActive: bar.isActive });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingBar) {
			updateMutation.mutate({
				id: editingBar.id,
				data: { name: formData.name, isActive: formData.isActive },
			});
		} else {
			createMutation.mutate({
				name: formData.name,
				isActive: formData.isActive,
			});
		}
	};

	const handleDelete = (id: string) => {
		if (confirm('Вы уверены, что хотите удалить этот бар?')) {
			deleteMutation.mutate(id);
		}
	};

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="bars-management-page">
			<button onClick={() => navigate('/')} className="page-back-button">
				<ArrowLeft className="page-back-icon" />
				<span>Back to Home</span>
			</button>

			<div className="page-header">
				<h1>Управление барами</h1>
				<Button variant="primary" onClick={handleCreate}>
					<Plus className="button-icon" />
					<span>Добавить бар</span>
				</Button>
			</div>

			{bars && bars.length > 0 ? (
				<div className="bars-list">
					{bars.map((bar) => (
						<Card key={bar.id} className="bar-management-card">
							<div className="bar-management-content">
								<div>
									<h3 className="bar-management-name">{bar.name}</h3>
									<p className="bar-management-status">
										Статус:{' '}
										<span
											className={
												bar.isActive ? 'status-active' : 'status-inactive'
											}
										>
											{bar.isActive ? 'Активен' : 'Неактивен'}
										</span>
									</p>
									<p className="bar-management-date">
										Создан: {formatDate(bar.createdAt)}
									</p>
								</div>
								<div className="bar-management-actions">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleEdit(bar)}
									>
										<Edit2 className="button-icon" />
										<span>Редактировать</span>
									</Button>
									<Button
										variant="danger"
										size="sm"
										onClick={() => handleDelete(bar.id)}
									>
										<Trash2 className="button-icon" />
										<span>Удалить</span>
									</Button>
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<p className="empty-message">Бары не найдены</p>
				</Card>
			)}

			{/* Create Modal */}
			<Modal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				title="Добавить бар"
			>
				<form onSubmit={handleSubmit} className="bar-form">
					<Input
						label="Название бара"
						type="text"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
						placeholder="Введите название бара"
					/>
					<div className="form-checkbox">
						<label>
							<input
								type="checkbox"
								checked={formData.isActive}
								onChange={(e) =>
									setFormData({ ...formData, isActive: e.target.checked })
								}
							/>
							<span>Активен</span>
						</label>
					</div>
					<div className="form-actions">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsCreateModalOpen(false)}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							variant="primary"
							loading={createMutation.isPending}
						>
							Создать
						</Button>
					</div>
				</form>
			</Modal>

			{/* Edit Modal */}
			<Modal
				isOpen={!!editingBar}
				onClose={() => setEditingBar(null)}
				title="Редактировать бар"
			>
				<form onSubmit={handleSubmit} className="bar-form">
					<Input
						label="Название бара"
						type="text"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
						placeholder="Введите название бара"
					/>
					<div className="form-checkbox">
						<label>
							<input
								type="checkbox"
								checked={formData.isActive}
								onChange={(e) =>
									setFormData({ ...formData, isActive: e.target.checked })
								}
							/>
							<span>Активен</span>
						</label>
					</div>
					<div className="form-actions">
						<Button
							type="button"
							variant="outline"
							onClick={() => setEditingBar(null)}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							variant="primary"
							loading={updateMutation.isPending}
						>
							Сохранить
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	);
}
