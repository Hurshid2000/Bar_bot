import { Controller, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Post('register')
	@ApiOperation({ summary: 'Регистрация токена устройства для push-уведомлений' })
	async registerToken(@CurrentUser() user: any, @Body() dto: RegisterTokenDto) {
		return this.notificationsService.registerToken(user.id, dto.token, dto.deviceInfo);
	}

	@Delete('unregister')
	@ApiOperation({ summary: 'Удаление токена устройства' })
	async unregisterToken(@CurrentUser() user: any, @Body() dto: RegisterTokenDto) {
		return this.notificationsService.unregisterToken(user.id, dto.token);
	}
}
