import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Card } from './card.entity';
import { Recharge } from './recharge.entity';
import { PdvTerminal } from './pdv-terminal.entity';
import { Session } from './session.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Transaction } from './transaction.entity';
import { SaldoReserve } from './saldo-reserve.entity';
import { NfceDocument } from './nfce-document.entity';
import { SyncQueue } from './sync-queue.entity';
import { Comanda } from './comanda.entity';
import { ComandaItem } from './comanda-item.entity';
import { ComandaPayment } from './comanda-payment.entity';
import { ApiIntegration } from './api-integration.entity';
import { ExitRelease } from './exit-release.entity';
import { Customer } from './customer.entity';
import { PaymentIntent } from './payment-intent.entity';
import { SubscriptionInvoice } from './subscription-invoice.entity';
import { AuditLog } from './audit-log.entity';

export const entityList = [
  Tenant,
  User,
  Event,
  Customer,
  Card,
  Recharge,
  PdvTerminal,
  Session,
  Product,
  Order,
  OrderItem,
  Transaction,
  SaldoReserve,
  NfceDocument,
  SyncQueue,
  Comanda,
  ComandaItem,
  ComandaPayment,
  ApiIntegration,
  ExitRelease,
  PaymentIntent,
  SubscriptionInvoice,
  AuditLog,
];
