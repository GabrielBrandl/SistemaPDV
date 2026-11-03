import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission('products.manage', 'pos.sell', 'reports.view')
  findByEvent(@TenantId() tenantId: string, @Query('event_id') eventId: string) {
    return this.productsService.findByEvent(tenantId, eventId);
  }

  @Get('stock/low')
  @RequirePermission('products.manage', 'reports.view')
  lowStock(
    @TenantId() tenantId: string,
    @Query('event_id') eventId: string,
  ) {
    return this.productsService.lowStock(tenantId, eventId);
  }

  @Get(':id')
  @RequirePermission('products.manage', 'pos.sell')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermission('products.manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('products.manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('products.manage')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id);
  }
}
