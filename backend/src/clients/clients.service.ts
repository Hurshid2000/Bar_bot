import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';
import { ClientTransactionType } from '@prisma/client';

@Injectable()
export class ClientsService {
	constructor(private prisma: PrismaService) {}

	async create(userId: string, createClientDto: CreateClientDto) {
		const { barId, name, phone } = createClientDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Проверяем уникальность имени в рамках бара
		const existingClient = await this.prisma.client.findUnique({
			where: {
				barId_name: {
					barId,
					name,
				},
			},
		});

		if (existingClient) {
			throw new ConflictException(`Client with name "${name}" already exists in this bar`);
		}

		// Создаем клиента
		return this.prisma.client.create({
			data: {
				barId,
				name,
				phone: phone || null,
				balance: 0,
			},
		});
	}

	async findAll(userId: string, userRole: string, filter: ClientFilterDto) {
		const where: any = {};

		// Фильтр по бару
		if (filter.barId) {
			where.barId = filter.barId;
		}

		// Фильтр по активности
		if (filter.isActive !== undefined) {
			where.isActive = filter.isActive;
		}

		// Поиск по имени или телефону
		if (filter.search) {
			where.OR = [
				{ name: { contains: filter.search, mode: 'insensitive' } },
				{ phone: { contains: filter.search, mode: 'insensitive' } },
			];
		}

		// Фильтр по балансу (должники/депозитники)
		if (filter.sortBy === 'debt') {
			where.balance = { lt: 0 };
		} else if (filter.sortBy === 'deposit') {
			where.balance = { gt: 0 };
		}
		// Если sortBy === 'all' или не указан, показываем всех

		// Для WORKER показываем только клиентов их бара
		if (userRole === 'WORKER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				if (filter.barId && !barIds.includes(filter.barId)) {
					throw new BadRequestException('Access denied to this bar');
				}
				if (!filter.barId) {
					where.barId = { in: barIds };
				}
			} else {
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 20);
			}
		}

		// Для MANAGER показываем только клиентов их баров
		if (userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				if (filter.barId && !barIds.includes(filter.barId)) {
					throw new BadRequestException('Access denied to this bar');
				}
				if (!filter.barId) {
					where.barId = { in: barIds };
				}
			} else {
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 20);
			}
		}

		const skip = getSkip(filter.page, filter.limit);
		const [data, total] = await Promise.all([
			this.prisma.client.findMany({
				where,
				skip,
				take: filter.limit || 20,
				orderBy: { balance: 'asc' }, // Сначала должники (отрицательные), потом депозитники
				include: {
					bar: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			}),
			this.prisma.client.count({ where }),
		]);

		return createPaginatedResponse(data, total, filter.page || 1, filter.limit || 20);
	}

	async findOne(id: string, userId: string, userRole: string) {
		const client = await this.prisma.client.findUnique({
			where: { id },
			include: {
				bar: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		if (!client) {
			throw new NotFoundException(`Client with ID ${id} not found`);
		}

		// Проверка доступа
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (!barIds.includes(client.barId)) {
				throw new BadRequestException('Access denied to this client');
			}
		}

		return client;
	}

	async update(id: string, userId: string, userRole: string, updateClientDto: UpdateClientDto) {
		const client = await this.findOne(id, userId, userRole);

		// Если меняется имя, проверяем уникальность
		if (updateClientDto.name && updateClientDto.name !== client.name) {
			const existingClient = await this.prisma.client.findUnique({
				where: {
					barId_name: {
						barId: client.barId,
						name: updateClientDto.name,
					},
				},
			});

			if (existingClient && existingClient.id !== id) {
				throw new ConflictException(`Client with name "${updateClientDto.name}" already exists in this bar`);
			}
		}

		// Получаем текущие значения для логирования изменений
		const oldValues: Record<string, string> = {};
		const newValues: Record<string, string> = {};

		if (updateClientDto.name !== undefined && updateClientDto.name !== client.name) {
			oldValues.name = client.name;
			newValues.name = updateClientDto.name;
		}

		if (updateClientDto.phone !== undefined && updateClientDto.phone !== client.phone) {
			oldValues.phone = client.phone || '';
			newValues.phone = updateClientDto.phone || '';
		}

		if (updateClientDto.isActive !== undefined && updateClientDto.isActive !== client.isActive) {
			oldValues.isActive = String(client.isActive);
			newValues.isActive = String(updateClientDto.isActive);
		}

		// Обновляем клиента
		const updatedClient = await this.prisma.client.update({
			where: { id },
			data: updateClientDto,
		});

		// Логируем изменения
		if (Object.keys(oldValues).length > 0) {
			await Promise.all(
				Object.keys(oldValues).map((fieldName) =>
					this.prisma.clientEditLog.create({
						data: {
							clientId: id,
							userId,
							fieldName,
							oldValue: oldValues[fieldName],
							newValue: newValues[fieldName],
						},
					}),
				),
			);
		}

		return updatedClient;
	}

	async createTransaction(userId: string, createTransactionDto: CreateTransactionDto) {
		const { clientId, type, amount, comment } = createTransactionDto;

		// Проверяем существование клиента
		const client = await this.prisma.client.findUnique({
			where: { id: clientId },
		});

		if (!client) {
			throw new NotFoundException(`Client with ID ${clientId} not found`);
		}

		// Вычисляем новое значение баланса
		let newBalance: number;
		if (type === ClientTransactionType.DEPOSIT) {
			// Депозит - увеличиваем баланс
			newBalance = client.balance + amount;
		} else if (type === ClientTransactionType.DEBT) {
			// Долг - уменьшаем баланс
			newBalance = client.balance - amount;
		} else if (type === ClientTransactionType.PAYMENT) {
			// Платеж - увеличиваем баланс (автоматически погашает долг или увеличивает депозит)
			newBalance = client.balance + amount;
		} else {
			throw new BadRequestException('Invalid transaction type');
		}

		// Создаем транзакцию и обновляем баланс в одной транзакции БД
		const [transaction, updatedClient] = await this.prisma.$transaction([
			this.prisma.clientTransaction.create({
				data: {
					clientId,
					userId,
					type,
					amount,
					comment: comment || null,
				},
			}),
			this.prisma.client.update({
				where: { id: clientId },
				data: { balance: newBalance },
			}),
		]);

		return {
			transaction,
			client: updatedClient,
		};
	}

	async getTransactions(clientId: string, userId: string, userRole: string) {
		// Проверяем доступ к клиенту
		await this.findOne(clientId, userId, userRole);

		return this.prisma.clientTransaction.findMany({
			where: { clientId },
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
	}

	async getEditLogs(clientId: string, userId: string, userRole: string) {
		// Проверяем доступ к клиенту
		await this.findOne(clientId, userId, userRole);

		return this.prisma.clientEditLog.findMany({
			where: { clientId },
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});
	}

	/**
	 * Получить статистику по клиентам для бара
	 */
	async getStatistics(barId: string, userId: string, userRole: string) {
		// Проверяем доступ к бару
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (!barIds.includes(barId)) {
				throw new BadRequestException('Access denied to this bar');
			}
		}

		const clients = await this.prisma.client.findMany({
			where: {
				barId,
				isActive: true,
			},
			select: {
				balance: true,
			},
		});

		const totalDebt = clients
			.filter((c) => c.balance < 0)
			.reduce((sum, c) => sum + Math.abs(c.balance), 0);

		const totalDeposit = clients
			.filter((c) => c.balance > 0)
			.reduce((sum, c) => sum + c.balance, 0);

		const debtorsCount = clients.filter((c) => c.balance < 0).length;
		const depositorsCount = clients.filter((c) => c.balance > 0).length;

		return {
			totalDebt,
			totalDeposit,
			debtorsCount,
			depositorsCount,
			totalClients: clients.length,
		};
	}
}
