import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entityList } from './database/entities/entity-list';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { EventsModule } from './events/events.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PdvModule } from './pdv/pdv.module';
import { SyncModule } from './sync/sync.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { ReportsModule } from './reports/reports.module';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';
import { ComandasModule } from './comandas/comandas.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ExitModule } from './exit/exit.module';
import { AdminModule } from './admin/admin.module';
import { CustomersModule } from './customers/customers.module';
import { PaymentsModule } from './payments/payments.module';
import { PlatformModule } from './platform/platform.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        const dbType = config.get<string>('DB_TYPE', dbUrl ? 'postgres' : 'sqlite');
        const dbHost = config.get<string>('DB_HOST');

        if (dbType === 'postgres') {
          const sslEnabled = ['true', '1', 'require'].includes(
            (config.get<string>('DB_SSL') || 'false').toLowerCase(),
          );
          const base = {
            type: 'postgres' as const,
            entities: entityList,
            synchronize: true,
            logging: config.get<string>('DB_LOGGING') === 'true',
            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
            extra: {
              connectionTimeoutMillis: 15_000,
            },
          };

          if (dbUrl) {
            return { ...base, url: dbUrl };
          }

          if (dbHost) {
            return {
              ...base,
              host: dbHost,
              port: Number(config.get<string>('DB_PORT') || 5432),
              username: config.get<string>('DB_USER'),
              password: config.get<string>('DB_PASSWORD'),
              database: config.get<string>('DB_NAME'),
            };
          }
        }

        return {
          type: 'sqlite' as const,
          database: config.get<string>('SQLITE_PATH', 'pdv.sqlite'),
          entities: entityList,
          synchronize: true,
          logging: false,
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    PlansModule,
    PlatformModule,
    UsersModule,
    CardsModule,
    CustomersModule,
    PaymentsModule,
    EventsModule,
    ProductsModule,
    OrdersModule,
    ComandasModule,
    IntegrationsModule,
    ExitModule,
    AdminModule,
    PdvModule,
    SyncModule,
    FiscalModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
