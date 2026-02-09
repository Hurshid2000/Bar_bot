import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { categoriesApi, type CreateCategoryDto, type UpdateCategoryDto } from '../../api/categories.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ProductType, type Category } from '../../types/common.types';
import './CategoriesListPage.css';

export function CategoriesListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { isAuthenticated, isLoading: isLoadingAuth } = useAuth();
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<{
		id: string;
		name: string;
		type: ProductType;
	} | null>(null);
	const [addFormData, setAddFormData] = useState<CreateCategoryDto>({
		name: '',
		type: ProductType.PRODUCT,
	});
	const [editFormData, setEditFormData] = useState<UpdateCategoryDto>({
		name: '',
		type: ProductType.PRODUCT,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { data: categories, isLoading } = useQuery({
		queryKey: ['categories'],
		queryFn: () => categoriesApi.getAll(),
		enabled: !isLoadingAuth && isAuthenticated,
	});

	const createMutation = useMutation({
		mutationFn: (data: CreateCategoryDto) => categoriesApi.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			setIsAddModalOpen(false);
			setAddFormData({ name: '', type: ProductType.PRODUCT });
			setErrors({});
		},
		onError: (error: any) => {
			setErrors({ submit: error.message || 'Ошибка при создании категории' });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
			categoriesApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['categories'] });
			setEditingCategory(null);
			setEditFormData({ name: '', type: ProductType.PRODUCT });
			setErrors({});
		},
		onError: (error: any) => {
			setErrors({ submit: error.message || 'Ошибка при обновлении категории' });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => categoriesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['categories'] });
		},
	});

	const handleAdd = () => {
		setIsAddModalOpen(true);
		setAddFormData({ name: '', type: ProductType.PRODUCT });
		setErrors({});
	};

	const handleEdit = (category: Category) => {
		setEditingCategory({
			id: category.id,
			name: category.name,
			type: category.type || ProductType.PRODUCT,
		});
		setEditFormData({ name: category.name, type: category.type || ProductType.PRODUCT });
		setErrors({});
	};

	const handleDelete = (id: string) => {
		if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
			deleteMutation.mutate(id);
		}
	};

	const validateAdd = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!addFormData.name.trim()) {
			newErrors.name = 'Название обязательно';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const validateEdit = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!editFormData.name?.trim()) {
			newErrors.name = 'Название обязательно';
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleAddSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateAdd()) return;
		createMutation.mutate(addFormData);
	};

	const handleEditSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateEdit() || !editingCategory) return;
		updateMutation.mutate({ id: editingCategory.id, data: editFormData });
	};

	const typeOptions = [
		{ value: ProductType.PRODUCT, label: 'Продукт' },
		{ value: ProductType.SPORT_PIT, label: 'Спортпит' },
		{ value: ProductType.FOOD, label: 'Еда' },
	];

	const getTypeLabel = (type: ProductType) => {
		return typeOptions.find((opt) => opt.value === type)?.label || type;
	};

	// Группируем категории по типам
	const categoriesByType = categories?.reduce(
		(acc, cat) => {
			const type = cat.type || ProductType.PRODUCT;
			if (!acc[type]) acc[type] = [];
			acc[type].push(cat);
			return acc;
		},
		{} as Record<ProductType, Category[]>,
	) || {};

	if (isLoading) {
		return <Loading />;
	}

	return (
		<div className="categories-list-page">
			<div className="page-header-back">
				<Button variant="ghost" onClick={() => navigate('/')} className="page-back-btn">
					<ArrowLeft size={20} />
					Назад
				</Button>
			</div>
			<div className="page-header">
				<h1>Категории</h1>
				<Button variant="primary" onClick={handleAdd}>
					<Plus size={20} style={{ stroke: 'white', color: 'white' }} />
					Добавить категорию
				</Button>
			</div>

			{Object.keys(categoriesByType).length > 0 ? (
				<div className="categories-sections">
					{Object.entries(categoriesByType).map(([type, cats]) => {
						const typedCats = cats as Category[];
						return (
							<div key={type} className="category-section">
								<h2 className="category-section-title">
									{getTypeLabel(type as ProductType)}
								</h2>
								<div className="categories-list">
									{typedCats.map((category) => (
									<Card key={category.id} className="category-card">
										<div className="category-card-content">
											<div>
												<h3>{category.name}</h3>
												<span className="category-type-badge">
													{getTypeLabel(category.type || ProductType.PRODUCT)}
												</span>
											</div>
											<div className="category-card-actions">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleEdit(category)}
													title="Редактировать"
												>
													<Edit2 size={16} />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDelete(category.id)}
													title="Удалить"
												>
													<Trash2 size={16} />
												</Button>
											</div>
										</div>
									</Card>
									))}
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<Card>
					<p>Категории не найдены</p>
				</Card>
			)}

			{/* Модальное окно добавления */}
			<Modal
				isOpen={isAddModalOpen}
				onClose={() => {
					setIsAddModalOpen(false);
					setErrors({});
				}}
				title="Добавить категорию"
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => {
								setIsAddModalOpen(false);
								setErrors({});
							}}
						>
							Отмена
						</Button>
						<Button
							variant="primary"
							onClick={handleAddSubmit}
							disabled={createMutation.isPending}
						>
							{createMutation.isPending ? 'Создание...' : 'Создать'}
						</Button>
					</>
				}
			>
				<form onSubmit={handleAddSubmit}>
					<Input
						label="Название категории"
						value={addFormData.name}
						onChange={(e) => {
							setAddFormData({ ...addFormData, name: e.target.value });
							setErrors({ ...errors, name: '' });
						}}
						error={errors.name}
						required
					/>
					<Select
						label="Тип категории"
						value={addFormData.type}
						onChange={(e) => {
							setAddFormData({
								...addFormData,
								type: e.target.value as ProductType,
							});
						}}
						options={typeOptions}
						required
					/>
					{errors.submit && (
						<div className="form-error">{errors.submit}</div>
					)}
				</form>
			</Modal>

			{/* Модальное окно редактирования */}
			<Modal
				isOpen={!!editingCategory}
				onClose={() => {
					setEditingCategory(null);
					setErrors({});
				}}
				title="Редактировать категорию"
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => {
								setEditingCategory(null);
								setErrors({});
							}}
						>
							Отмена
						</Button>
						<Button
							variant="primary"
							onClick={handleEditSubmit}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
						</Button>
					</>
				}
			>
				<form onSubmit={handleEditSubmit}>
					<Input
						label="Название категории"
						value={editFormData.name || ''}
						onChange={(e) => {
							setEditFormData({ ...editFormData, name: e.target.value });
							setErrors({ ...errors, name: '' });
						}}
						error={errors.name}
						required
					/>
					<Select
						label="Тип категории"
						value={editFormData.type || ProductType.PRODUCT}
						onChange={(e) => {
							setEditFormData({
								...editFormData,
								type: e.target.value as ProductType,
							});
						}}
						options={typeOptions}
						required
					/>
					{errors.submit && (
						<div className="form-error">{errors.submit}</div>
					)}
				</form>
			</Modal>
		</div>
	);
}
