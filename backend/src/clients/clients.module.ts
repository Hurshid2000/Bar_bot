import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';

@Module({
	imports: [PrismaModule, GuardsModule],
	controllers: [ClientsController],
	providers: [ClientsService],
	exports: [ClientsService],
})
export class ClientsModule {}
