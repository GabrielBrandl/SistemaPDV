import { Controller, Get } from '@nestjs/common';
import { PLAN_CATALOG } from './plans.config';

@Controller('plans')
export class PlansController {
  @Get()
  list() {
    return PLAN_CATALOG;
  }
}
