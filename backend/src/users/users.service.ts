import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, RoleType } from '@prisma/client';

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

	async update(id: string, data: { name?: string }): Promise<User> {
		return this.prisma.user.update({
			where: { id },
			data,
		});
	}

	async findById(id: string) {
		return this.prisma.user.findUnique({
			where: { id },
			include: {
				bars: true,
			},
		});
	}
}
