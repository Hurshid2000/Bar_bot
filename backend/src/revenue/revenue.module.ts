import { Module, forwardRef } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
	imports: [PrismaModule, forwardRef(() => NotificationsModule)],
	controllers: [RevenueController],
	providers: [RevenueService],
	exports: [RevenueService],
})
export class RevenueModule {}
