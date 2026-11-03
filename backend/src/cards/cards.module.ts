import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Card,
  Event,
  PaymentIntent,
  Recharge,
  SaldoReserve,
  Transaction,
} from '../database/entities';
import { CashModule } from '../cash/cash.module';
import { PixModule } from '../payments/pix.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Card,
      Recharge,
      SaldoReserve,
      Transaction,
      PaymentIntent,
      Event,
    ]),
    CashModule,
    PixModule,
  ],
  providers: [CardsService],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
