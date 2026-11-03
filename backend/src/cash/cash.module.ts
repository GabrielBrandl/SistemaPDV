import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CashMovement,
  CashSession,
  Event,
} from '../database/entities';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashSession, CashMovement, Event])],
  providers: [CashService],
  controllers: [CashController],
  exports: [CashService],
})
export class CashModule {}
