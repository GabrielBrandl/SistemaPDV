import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card, Comanda, Customer, Event } from '../database/entities';
import { CardsModule } from '../cards/cards.module';
import { ComandasModule } from '../comandas/comandas.module';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { SupabaseCustomersService } from './supabase-customers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Card, Comanda, Event]),
    CardsModule,
    forwardRef(() => ComandasModule),
  ],
  providers: [CustomersService, SupabaseCustomersService],
  controllers: [CustomersController],
  exports: [CustomersService, SupabaseCustomersService],
})
export class CustomersModule {}
