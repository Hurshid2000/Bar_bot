import { Module } from '@nestjs/common';
import { ArrivalsService } from './arrivals.service';
import { ArrivalsController } from './arrivals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
	imports: [PrismaModule, GuardsModule, NotificationsModule],
	controllers: [ArrivalsController],
	providers: [ArrivalsService],
	exports: [ArrivalsService],
})
export class ArrivalsModule {}
