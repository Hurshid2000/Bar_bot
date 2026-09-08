import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { BotCommandsService } from './bot-commands.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RevenueModule } from '../revenue/revenue.module';

@Module({
	imports: [PrismaModule, ScheduleModule.forRoot(), forwardRef(() => RevenueModule)],
	controllers: [NotificationsController],
	providers: [NotificationsService, NotificationsScheduler, BotCommandsService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
