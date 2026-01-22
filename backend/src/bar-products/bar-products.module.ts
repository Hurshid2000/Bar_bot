import { Module } from '@nestjs/common';
import { BarProductsService } from './bar-products.service';
import { BarProductsController } from './bar-products.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [BarProductsController],
	providers: [BarProductsService],
	exports: [BarProductsService],
})
export class BarProductsModule {}
