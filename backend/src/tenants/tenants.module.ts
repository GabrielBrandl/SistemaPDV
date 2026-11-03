import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant, User } from '../database/entities';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { BrandingController } from './branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User])],
  providers: [TenantsService],
  controllers: [TenantsController, BrandingController],
  exports: [TenantsService],
})
export class TenantsModule {}
