import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersApi, type UpdateUserDto, type CreateUserDto } from '../../api/users.api';
import { barsApi } from '../../api/bars.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { RoleType } from '../../types/common.types';
import { formatDate } from '../../utils/format';
import './UsersManagementPage.css';

export function UsersManagementPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<{
		id: string;
		name: string;
		role: RoleType;
	} | null>(null);
	const [formData, setFormData] = useState<{
		name: string;
		role: RoleType;
	}>({ name: '', role: RoleType.WORKER });
	const [addFormData, setAddFormData] = useState<CreateUserDto>({
		telegramId: '',
		name: '',
		role: RoleType.WORKER,
	});

	const { data: users, isLoading, error: usersError } = useQuery({
		queryKey: ['users'],
		queryFn: () => usersApi.getAll(),
		enabled: !isLoadingAuth && isAuthenticated,
		retry: false,
	});

	const { data: bars } = useQuery({
		queryKey: ['bars'],
		queryFn: () => barsApi.getAll(),
		enabled: !isLoadingAuth && isAuthenticated,
	});

	const createMutation = useMutation({
		mutationFn: (data: CreateUserDto) => usersApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setIsAddModalOpen(false);
			setAddFormData({ telegramId: '', name: '', role: RoleType.WORKER });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
			usersApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setEditingUser(null);
			setFormData({ name: '', role: RoleType.WORKER });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => usersApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});

	const assignBarMutation = useMutation({
		mutationFn: ({ userId, barId }: { userId: string; barId: string }) =>
			usersApi.assignBar(userId, barId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});

	const removeBarMutation = useMutation({
		mutationFn: ({ userId, barId }: { userId: string; barId: string }) =>
			usersApi.removeBar(userId, barId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
		},
	});

	const handleEdit = (user: { id: string; name: string; role: RoleType }) => {
		setEditingUser(user);
		setFormData({ name: user.name, role: user.role });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingUser) {
			updateMutation.mutate({
				id: editingUser.id,
				data: { name: formData.name, role: formData.role },
			});
		}
	};

	const handleAddSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate(addFormData);
	};

	const handleDelete = (id: string) => {
		if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
			deleteMutation.mutate(id);
		}
	};

	const handleAssignBar = (userId: string, barId: string) => {
		assignBarMutation.mutate({ userId, barId });
	};

	const handleRemoveBar = (userId: string, barId: string) => {
		removeBarMutation.mutate({ userId, barId });
	};

	if (isLoadingAuth || isLoading) {
		return <Loading />;
	}

	if (usersError) {
		return (
			<div className="users-management-page">
				<div className="page-header-back">
					<Button variant="ghost" onClick={() => navigate('/')} className="page-back-btn">
						<ArrowLeft size={20} />
						Назад
					</Button>
				</div>
				<div className="page-header">
					<h1>Управление пользователями</h1>
				</div>
				<Card>
					<p className="empty-message">
						Ошибка загрузки пользователей: {(usersError as any)?.message || 'Неизвестная ошибка'}
					</p>
				</Card>
			</div>
		);
	}

	return (
		<div className="users-management-page">
			<div className="page-header-back">
				<Button variant="ghost" onClick={() => navigate('/')} className="page-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>

			<div className="page-header">
				<h1>Управление пользователями</h1>
				<Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
					<UserPlus className="button-icon" />
					<span>Добавить пользователя</span>
				</Button>
			</div>

			{users && users.length > 0 ? (
				<div className="users-list">
					{users.map((user) => (
						<Card key={user.id} className="user-management-card">
							<div className="user-management-content">
								<div className="user-management-info">
									<h3 className="user-management-name">{user.name}</h3>
									<p className="user-management-telegram">
										Telegram ID: {user.telegramId}
									</p>
									<p className="user-management-role">
										Роль:{' '}
										<span className={`role-${user.role.toLowerCase()}`}>
											{user.role}
										</span>
									</p>
									<p className="user-management-date">
										Создан: {formatDate(user.createdAt)}
									</p>
									{user.bars && user.bars.length > 0 && (
										<div className="user-management-bars">
											<p className="bars-label">Бары:</p>
											<div className="bars-list">
												{user.bars.map((userBar) => (
													<div key={userBar.id} className="bar-tag">
														<span>{userBar.bar?.name}</span>
														<button
															className="bar-tag-remove"
															onClick={() =>
																handleRemoveBar(user.id, userBar.barId)
															}
														>
															×
														</button>
													</div>
												))}
											</div>
											{bars && bars.length > user.bars.length && (
												<select
													className="select-native"
													value=""
													onChange={(e) => {
														if (e.target.value) {
															handleAssignBar(user.id, e.target.value);
															e.target.value = '';
														}
													}}
												>
													<option value="">Добавить бар</option>
													{bars
														.filter(
															(bar) =>
																!user.bars?.some(
																	(ub) => ub.barId === bar.id,
																),
														)
														.map((bar) => (
															<option key={bar.id} value={bar.id}>
																{bar.name}
															</option>
														))}
												</select>
											)}
										</div>
									)}
									{(!user.bars || user.bars.length === 0) && bars && bars.length > 0 && (
										<div className="user-management-bars">
											<p className="bars-label">Бары не назначены</p>
											<select
												className="select-native"
												value=""
												onChange={(e) => {
													if (e.target.value) {
														handleAssignBar(user.id, e.target.value);
														e.target.value = '';
													}
												}}
											>
												<option value="">Добавить бар</option>
												{bars.map((bar) => (
													<option key={bar.id} value={bar.id}>
														{bar.name}
													</option>
												))}
											</select>
										</div>
									)}
								</div>
								<div className="user-management-actions">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleEdit(user)}
									>
										<Edit2 className="button-icon" />
										<span>Редактировать</span>
									</Button>
									<Button
										variant="danger"
										size="sm"
										onClick={() => handleDelete(user.id)}
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
					<p className="empty-message">Пользователи не найдены</p>
				</Card>
			)}

			{/* Edit Modal */}
			<Modal
				isOpen={!!editingUser}
				onClose={() => setEditingUser(null)}
				title="Редактировать пользователя"
			>
				<form onSubmit={handleSubmit} className="user-form">
					<Input
						label="Имя пользователя"
						type="text"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						required
						placeholder="Введите имя"
					/>
					<Select
						label="Роль"
						value={formData.role}
						onChange={(e) =>
							setFormData({ ...formData, role: e.target.value as RoleType })
						}
						options={[
							{ value: RoleType.ADMIN, label: 'ADMIN' },
							{ value: RoleType.MANAGER, label: 'MANAGER' },
							{ value: RoleType.WORKER, label: 'WORKER' },
						]}
					/>
					<div className="form-actions">
						<Button
							type="button"
							variant="outline"
							onClick={() => setEditingUser(null)}
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

			{/* Add User Modal */}
			<Modal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				title="Добавить пользователя"
			>
				<form onSubmit={handleAddSubmit} className="user-form">
					<Input
						label="Telegram ID"
						type="text"
						value={addFormData.telegramId}
						onChange={(e) => setAddFormData({ ...addFormData, telegramId: e.target.value })}
						required
						placeholder="Введите Telegram ID"
					/>
					<Input
						label="Имя пользователя"
						type="text"
						value={addFormData.name}
						onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
						required
						placeholder="Введите имя"
					/>
					<Select
						label="Роль"
						value={addFormData.role || RoleType.WORKER}
						onChange={(e) =>
							setAddFormData({ ...addFormData, role: e.target.value as RoleType })
						}
						options={[
							{ value: RoleType.ADMIN, label: 'ADMIN' },
							{ value: RoleType.MANAGER, label: 'MANAGER' },
							{ value: RoleType.WORKER, label: 'WORKER' },
						]}
					/>
					<div className="form-actions">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsAddModalOpen(false)}
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
		</div>
	);
}
