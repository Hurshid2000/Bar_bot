import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { StockModule } from '../stock/stock.module';

@Module({
	imports: [PrismaModule, GuardsModule, StockModule],
	controllers: [SalesController],
	providers: [SalesService],
	exports: [SalesService],
})
export class SalesModule {}
