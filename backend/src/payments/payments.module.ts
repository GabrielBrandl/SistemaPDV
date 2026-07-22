import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comanda, PaymentIntent } from '../database/entities';
import { ComandasModule } from '../comandas/comandas.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PixProvider } from './pix.provider';
import { SoftPosProvider } from './softpos.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntent, Comanda]),
    ComandasModule,
  ],
  providers: [PaymentsService, PixProvider, SoftPosProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
