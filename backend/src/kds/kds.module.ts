import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities';
import { KdsController } from './kds.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [KdsController],
})
export class KdsModule {}
