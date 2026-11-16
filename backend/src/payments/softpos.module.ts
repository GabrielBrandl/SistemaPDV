import { Module } from '@nestjs/common';
import { SoftPosProvider } from './softpos.provider';

@Module({
  providers: [SoftPosProvider],
  exports: [SoftPosProvider],
})
export class SoftPosModule {}
