import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Card,
  Comanda,
  ExitRelease,
  Product,
  User,
} from '../database/entities';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ExitModule } from '../exit/exit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comanda, Card, ExitRelease, User, Product]),
    ExitModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
