import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card, Comanda, ExitRelease } from '../database/entities';
import { ExitService } from './exit.service';
import { ExitController } from './exit.controller';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExitRelease, Comanda, Card]),
    CardsModule,
  ],
  providers: [ExitService],
  controllers: [ExitController],
  exports: [ExitService],
})
export class ExitModule {}
