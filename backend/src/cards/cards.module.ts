import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Card,
  Recharge,
  SaldoReserve,
  Transaction,
} from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Card, Recharge, SaldoReserve, Transaction])],
  providers: [CardsService],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
