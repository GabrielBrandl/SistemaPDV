import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../database/entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  findByEvent(tenantId: string, eventId: string) {
    return this.productsRepo.find({
      where: { tenantId, eventId },
      order: { categoria: 'ASC', nome: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.productsRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  create(tenantId: string, dto: CreateProductDto) {
    const product = this.productsRepo.create({
      tenantId,
      eventId: dto.event_id,
      nome: dto.nome,
      preco: dto.preco,
      categoria: dto.categoria ?? null,
      ativo: dto.ativo ?? true,
      controlaEstoque: dto.controla_estoque ?? false,
      estoqueAtual: dto.estoque_atual ?? 0,
      estoqueMinimo: dto.estoque_minimo ?? 0,
      somenteAdultos: dto.somente_adultos ?? false,
    });
    return this.productsRepo.save(product);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const product = await this.findOne(tenantId, id);
    Object.assign(product, {
      nome: dto.nome ?? product.nome,
      preco: dto.preco ?? product.preco,
      categoria: dto.categoria ?? product.categoria,
      ativo: dto.ativo ?? product.ativo,
      controlaEstoque: dto.controla_estoque ?? product.controlaEstoque,
      estoqueAtual: dto.estoque_atual ?? product.estoqueAtual,
      estoqueMinimo: dto.estoque_minimo ?? product.estoqueMinimo,
      somenteAdultos: dto.somente_adultos ?? product.somenteAdultos,
    });
    return this.productsRepo.save(product);
  }

  async decrementStock(tenantId: string, productId: string, qty: number) {
    const product = await this.findOne(tenantId, productId);
    if (!product.controlaEstoque) return product;
    if (product.estoqueAtual < qty) {
      throw new BadRequestException(`Estoque insuficiente: ${product.nome}`);
    }
    product.estoqueAtual -= qty;
    return this.productsRepo.save(product);
  }

  lowStock(tenantId: string, eventId: string) {
    return this.productsRepo
      .createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.event_id = :eventId', { eventId })
      .andWhere('p.controla_estoque = true')
      .andWhere('p.estoque_atual <= p.estoque_minimo')
      .getMany();
  }

  async remove(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id);
    product.ativo = false;
    return this.productsRepo.save(product);
  }
}
