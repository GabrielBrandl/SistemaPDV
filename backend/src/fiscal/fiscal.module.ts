import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NfceDocument, Order, Tenant } from '../database/entities';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { FocusNfeProvider } from './focus-nfe.provider';

@Module({
  imports: [TypeOrmModule.forFeature([NfceDocument, Order, Tenant])],
  providers: [FiscalService, FocusNfeProvider],
  controllers: [FiscalController],
  exports: [FiscalService],
})
export class FiscalModule {}
