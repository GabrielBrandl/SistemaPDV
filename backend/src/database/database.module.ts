import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Card,
  Event,
  PdvTerminal,
  Product,
  Tenant,
  User,
} from './entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Event, Product, Card, PdvTerminal]),
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
