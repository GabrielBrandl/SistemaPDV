import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comanda, PaymentIntent } from '../database/entities';
import { ComandasModule } from '../comandas/comandas.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SoftPosModule } from './softpos.module';
import { PixModule } from './pix.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntent, Comanda]),
    forwardRef(() => ComandasModule),
    PixModule,
    SoftPosModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, SoftPosModule, PixModule],
})
export class PaymentsModule {}
