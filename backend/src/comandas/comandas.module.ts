import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Comanda,
  ComandaItem,
  ComandaPayment,
  Product,
} from '../database/entities';
import { ComandasService } from './comandas.service';
import { ComandasController } from './comandas.controller';
import { CardsModule } from '../cards/cards.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Comanda,
      ComandaItem,
      ComandaPayment,
      Product,
    ]),
    CardsModule,
    IntegrationsModule,
  ],
  providers: [ComandasService],
  controllers: [ComandasController],
  exports: [ComandasService],
})
export class ComandasModule {}
