import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExpensesModule } from './expenses/expenses.module';
import { RevenueModule } from './revenue/revenue.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BarsModule } from './bars/bars.module';
import { GuardsModule } from './guards/guards.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { BarProductsModule } from './bar-products/bar-products.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { ArrivalsModule } from './arrivals/arrivals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoriesModule } from './inventories/inventories.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true, // Делает модуль глобально доступным
			envFilePath: '.env', // Указывает путь к .env файлу
		}),
		PrismaModule,
		ExpensesModule,
		RevenueModule,
		PurchasesModule,
		UsersModule,
		AuthModule,
		BarsModule,
		GuardsModule,
		CategoriesModule,
		ProductsModule,
		BarProductsModule,
		ReportsModule,
		HealthModule,
		OrdersModule,
		ArrivalsModule,
		NotificationsModule,
		InventoriesModule,
	],
})
export class AppModule {}
