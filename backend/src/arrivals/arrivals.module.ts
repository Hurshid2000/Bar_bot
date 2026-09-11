import { Module, forwardRef } from '@nestjs/common';
import { ArrivalsService } from './arrivals.service';
import { ArrivalsController } from './arrivals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockModule } from '../stock/stock.module';

@Module({
	imports: [PrismaModule, GuardsModule, forwardRef(() => NotificationsModule), StockModule],
	controllers: [ArrivalsController],
	providers: [ArrivalsService],
	exports: [ArrivalsService],
})
export class ArrivalsModule {}
