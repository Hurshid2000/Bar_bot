import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
} from '@nestjs/common';
import { RoleType } from '@prisma/client';

@Injectable()
export class BarAccessGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const user = request.user;
		const barId = request.params.barId || request.body.barId || request.query.barId;

		if (!user) {
			return false;
		}

		// ADMIN имеет доступ ко всем барам
		if (user.role === RoleType.ADMIN) {
			return true;
		}

		if (!barId) {
			// Если barId не указан, пропускаем (может быть список всех баров)
			return true;
		}

		// Проверяем доступ через UserBar связь
		const hasAccess = user.bars?.some(
			(userBar) => userBar.barId === barId,
		) || false;

		if (!hasAccess) {
			throw new ForbiddenException(
				'You do not have access to this bar',
			);
		}

		return true;
	}
}
