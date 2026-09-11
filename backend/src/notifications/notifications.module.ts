import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsScheduler } from './notifications.scheduler';
import { BotCommandsService } from './bot-commands.service';
import { AiParserService } from './ai-parser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RevenueModule } from '../revenue/revenue.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { SalesModule } from '../sales/sales.module';
import { ProductsModule } from '../products/products.module';
import { ArrivalsModule } from '../arrivals/arrivals.module';

@Module({
	imports: [
		PrismaModule,
		ScheduleModule.forRoot(),
		forwardRef(() => RevenueModule),
		PurchasesModule,
		SalesModule,
		ProductsModule,
		forwardRef(() => ArrivalsModule),
	],
	controllers: [NotificationsController],
	providers: [NotificationsService, NotificationsScheduler, BotCommandsService, AiParserService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
