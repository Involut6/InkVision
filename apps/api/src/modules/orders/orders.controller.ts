import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type {
  CheckoutResponse,
  CommerceStatusDto,
  OrderAccessResponse,
  OrderDto,
  Paginated,
} from '@inkvision/shared-types';

import { Client, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { ClientContext } from '../../common/decorators/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { MediaService } from '../media/media.service.js';

import { CheckoutDto, DownloadQueryDto, OrderAccessQueryDto } from './dto/checkout.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Commerce')
@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly deliveries: DeliveriesService,
    private readonly media: MediaService,
  ) {}

  @Public()
  @Get('commerce/status')
  @ApiOperation({
    summary: 'Whether this deployment can take payments, and why not if it cannot.',
  })
  commerceStatus(): CommerceStatusDto {
    return this.orders.commerceStatus();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('orders/checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a purchase.',
    description:
      'The price is read from the product server-side; the request carries no amount. Returns 503 while commerce is disabled.',
  })
  @ApiResponse({ status: 201, description: 'Pending order created; follow `checkoutUrl`.' })
  @ApiResponse({ status: 409, description: 'The product cannot currently be purchased.' })
  @ApiResponse({ status: 503, description: 'Commerce is not enabled on this deployment.' })
  async checkout(
    @Body() dto: CheckoutDto,
    @Client() client: ClientContext,
  ): Promise<CheckoutResponse> {
    return this.orders.checkout(dto, client);
  }

  @Public()
  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment provider webhook.',
    description:
      'The signature is verified over the raw request body, then the payment is re-read from the provider. Redelivered events are no-ops.',
  })
  async webhook(@Req() request: Request): Promise<{ received: true; handled: boolean }> {
    // `rawBody` is captured by the json body-parser verify hook in main.ts:
    // signature verification must run over the exact bytes received.
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);

    const result = await this.orders.handleWebhook({ rawBody, headers: request.headers });

    // Always 200 once the signature has been checked: a non-2xx makes providers
    // retry indefinitely, and a rejected-but-authentic event is not a server
    // fault. The outcome is in the body and in the logs.
    return { received: true, handled: result.handled };
  }

  @Public()
  @Get('orders/:reference')
  @ApiOperation({
    summary: 'Customer order lookup for the confirmation page.',
    description: 'Requires the opaque token issued at checkout.',
  })
  async findOne(
    @Param('reference') reference: string,
    @Query() query: OrderAccessQueryDto,
  ): Promise<OrderAccessResponse> {
    return this.orders.findByReferenceAndToken(reference, query.token);
  }

  @Public()
  @Get('downloads/:deliveryId')
  @ApiExcludeEndpoint()
  async download(
    @Param('deliveryId') deliveryId: string,
    @Query() query: DownloadQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const claim = await this.deliveries.claimDownload(deliveryId, query.expires, query.signature);
    const asset = await this.media.readPrivate(claim.assetId);

    const filename = `${claim.productTitle.replace(/[^a-zA-Z0-9 _-]/g, '')}.${extensionFor(asset.mimeType)}`;

    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', asset.sizeBytes);
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // A purchased file must never be cached by a shared proxy.
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    response.end(asset.buffer);
  }
}

@ApiTags('Admin · Commerce')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly deliveries: DeliveriesService,
  ) {}

  @Get()
  @RequirePermissions('order:read')
  async list(@Query() query: PaginationQueryDto): Promise<Paginated<OrderDto>> {
    return this.orders.list(query);
  }

  @Get(':id')
  @RequirePermissions('order:read')
  async findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.orders.toDto(id);
  }

  @Post('deliveries/:deliveryId/reset')
  @RequirePermissions('order:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Restore a customer’s download allowance after a genuine failure.',
  })
  async resetDelivery(@Param('deliveryId') deliveryId: string): Promise<void> {
    await this.deliveries.resetAttempts(deliveryId);
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'application/epub+zip':
      return 'epub';
    case 'application/zip':
      return 'zip';
    default:
      return 'bin';
  }
}
