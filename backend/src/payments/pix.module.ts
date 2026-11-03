import { Module } from '@nestjs/common';
import { PixProvider } from './pix.provider';

@Module({
  providers: [PixProvider],
  exports: [PixProvider],
})
export class PixModule {}
