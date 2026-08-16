import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditLog,
  Card,
  Comanda,
  ComandaPayment,
  Event,
  PdvTerminal,
  SubscriptionInvoice,
  Tenant,
  User,
} from '../database/entities';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Event,
      PdvTerminal,
      Card,
      Comanda,
      ComandaPayment,
      SubscriptionInvoice,
      AuditLog,
    ]),
  ],
  providers: [PlatformService],
  controllers: [PlatformController],
  exports: [PlatformService],
})
export class PlatformModule {}
