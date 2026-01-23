import { Module } from '@nestjs/common';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';

@Module({
	imports: [PrismaModule, GuardsModule],
	controllers: [InventoriesController],
	providers: [InventoriesService],
	exports: [InventoriesService],
})
export class InventoriesModule {}
