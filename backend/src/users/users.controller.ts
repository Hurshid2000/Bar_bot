import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Patch('me')
	@ApiOperation({ summary: 'Обновить профиль текущего пользователя (имя)' })
	@ApiResponse({ status: 200, description: 'Профиль обновлен' })
	@ApiResponse({ status: 401, description: 'Не авторизован' })
	async updateMe(@Request() req: any, @Body() body: { name?: string }) {
		if (body.name) {
			await this.usersService.update(req.user.id, { name: body.name });
		}
		const updated = await this.usersService.findOne(req.user.id);
		return {
			id: updated.id,
			telegramId: updated.telegramId,
			name: updated.name,
			role: updated.role,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			bars: updated.bars?.map((ub: any) => ({
				id: ub.id,
				userId: ub.userId,
				barId: ub.barId,
				bar: ub.bar
					? {
							id: ub.bar.id,
							name: ub.bar.name,
							isActive: ub.bar.isActive,
							createdAt: ub.bar.createdAt.toISOString(),
						}
					: undefined,
			})) || [],
		};
	}

	@Get('me')
	@ApiOperation({ summary: 'Получить данные текущего пользователя' })
	@ApiResponse({ status: 200, description: 'Данные пользователя' })
	@ApiResponse({ status: 401, description: 'Не авторизован' })
	findMe(@Request() req: any) {
		// JWT Strategy уже загрузил полного пользователя в req.user
		// Форматируем данные для фронтенда
		const user = req.user;
		return {
			id: user.id,
			telegramId: user.telegramId,
			name: user.name,
			role: user.role,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
			bars: user.bars?.map((ub: any) => ({
				id: ub.id,
				userId: ub.userId,
				barId: ub.barId,
				bar: ub.bar
					? {
							id: ub.bar.id,
							name: ub.bar.name,
							isActive: ub.bar.isActive,
							createdAt: ub.bar.createdAt.toISOString(),
						}
					: undefined,
			})) || [],
		};
	}

	@Get()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Получить список всех пользователей' })
	@ApiResponse({ status: 200, description: 'Список пользователей' })
	findAll() {
		return this.usersService.findAll();
	}

	@Post()
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Создать нового пользователя' })
	@ApiResponse({ status: 201, description: 'Пользователь создан' })
	@ApiResponse({ status: 400, description: 'Некорректные данные' })
	create(@Body() createUserDto: CreateUserDto) {
		return this.usersService.create(createUserDto);
	}

	@Get(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Получить пользователя по ID' })
	@ApiParam({ name: 'id', description: 'ID пользователя' })
	@ApiResponse({ status: 200, description: 'Данные пользователя' })
	@ApiResponse({ status: 404, description: 'Пользователь не найден' })
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Обновить данные пользователя' })
	@ApiParam({ name: 'id', description: 'ID пользователя' })
	@ApiResponse({ status: 200, description: 'Пользователь обновлен' })
	@ApiResponse({ status: 404, description: 'Пользователь не найден' })
	update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
		return this.usersService.update(id, updateUserDto);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Удалить пользователя' })
	@ApiParam({ name: 'id', description: 'ID пользователя' })
	@ApiResponse({ status: 200, description: 'Пользователь удален' })
	@ApiResponse({ status: 404, description: 'Пользователь не найден' })
	remove(@Param('id') id: string) {
		return this.usersService.remove(id);
	}

	// Управление привязкой к барам
	@Post(':userId/bars')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	assignBarToUser(
		@Param('userId') userId: string,
		@Body() body: { barId: string },
	) {
		return this.usersService.assignBarToUser(userId, body.barId);
	}

	@Delete(':userId/bars/:barId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	removeBarFromUser(
		@Param('userId') userId: string,
		@Param('barId') barId: string,
	) {
		return this.usersService.removeBarFromUser(userId, barId);
	}

	@Get(':userId/bars')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	getUserBars(@Param('userId') userId: string) {
		return this.usersService.getUserBars(userId);
	}
}
