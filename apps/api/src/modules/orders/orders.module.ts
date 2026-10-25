import { Module } from '@nestjs/common';

import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { MediaModule } from '../media/media.module.js';
import { ProductsModule } from '../products/products.module.js';

import { AdminOrdersController, OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [ProductsModule, MediaModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, DeliveriesService],
  exports: [OrdersService, DeliveriesService],
})
export class OrdersModule {}
