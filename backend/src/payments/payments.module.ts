import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comanda, PaymentIntent } from '../database/entities';
import { ComandasModule } from '../comandas/comandas.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SoftPosProvider } from './softpos.provider';
import { PixModule } from './pix.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentIntent, Comanda]),
    forwardRef(() => ComandasModule),
    PixModule,
  ],
  providers: [PaymentsService, SoftPosProvider],
  controllers: [PaymentsController],
  exports: [PaymentsService, PixModule],
})
export class PaymentsModule {}
