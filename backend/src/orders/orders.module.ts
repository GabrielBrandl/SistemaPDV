import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem, Product } from '../database/entities';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CardsModule } from '../cards/cards.module';
import { FiscalModule } from '../fiscal/fiscal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    CardsModule,
    forwardRef(() => FiscalModule),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
