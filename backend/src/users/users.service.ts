import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, RoleType } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findByTelegramId(telegramId: string): Promise<User | null> {
		return this.prisma.user.findUnique({
			where: {
				telegramId,
			},
		});
	}

	async create(data: {
		telegramId: string;
		name: string;
		role?: RoleType;
	}): Promise<User> {
		return this.prisma.user.create({
			data: {
				telegramId: data.telegramId,
				name: data.name,
				role: data.role || RoleType.WORKER,
			},
		});
	}

	async findAll() {
		return this.prisma.user.findMany({
			include: {
				bars: {
					include: {
						bar: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async findOne(id: string) {
		const user = await this.prisma.user.findUnique({
			where: { id },
			include: {
				bars: {
					include: {
						bar: true,
					},
				},
			},
		});

		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`);
		}

		return user;
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
		// Проверяем существование пользователя
		await this.findOne(id);

		return this.prisma.user.update({
			where: { id },
			data: updateUserDto,
		});
	}

	async remove(id: string) {
		// Проверяем существование пользователя
		await this.findOne(id);

		return this.prisma.user.delete({
			where: { id },
		});
	}

	async assignBarToUser(userId: string, barId: string) {
		// Проверяем существование пользователя и бара
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException(`User with ID ${userId} not found`);
		}

		const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Создаем связь (если уже существует, Prisma выбросит ошибку из-за unique constraint)
		return this.prisma.userBar.create({
			data: {
				userId,
				barId,
			},
		});
	}

	async removeBarFromUser(userId: string, barId: string) {
		const result = await this.prisma.userBar.deleteMany({
			where: {
				userId,
				barId,
			},
		});

		if (result.count === 0) {
			throw new NotFoundException(
				`User ${userId} is not assigned to bar ${barId}`,
			);
		}

		return result;
	}

	async getUserBars(userId: string) {
		const userBars = await this.prisma.userBar.findMany({
			where: { userId },
			include: {
				bar: true,
			},
		});

		return userBars.map((ub) => ub.bar);
	}
}
