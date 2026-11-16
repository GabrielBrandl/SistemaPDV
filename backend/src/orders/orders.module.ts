import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem, Product } from '../database/entities';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CardsModule } from '../cards/cards.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    CardsModule,
    forwardRef(() => FiscalModule),
    PrintersModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
