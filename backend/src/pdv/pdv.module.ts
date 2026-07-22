import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdvTerminal, Session } from '../database/entities';
import { PdvService } from './pdv.service';
import { PdvController } from './pdv.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PdvTerminal, Session])],
  providers: [PdvService],
  controllers: [PdvController],
})
export class PdvModule {}
