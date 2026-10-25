import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import type {
  NewsletterSubscribeResponse,
  NewsletterSubscriberDto,
  Paginated,
} from '@inkvision/shared-types';

import { Client, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { ClientContext } from '../../common/decorators/index.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

import { NewsletterSubscribeDto, NewsletterUnsubscribeDto } from './dto/newsletter.dto.js';
import { NewsletterService } from './newsletter.service.js';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subscribe to the newsletter.',
    description:
      'Idempotent. An address that is already subscribed gets the same response as a new one, so the endpoint cannot be used to check who is on the list.',
  })
  async subscribe(
    @Body() dto: NewsletterSubscribeDto,
    @Client() client: ClientContext,
  ): Promise<NewsletterSubscribeResponse> {
    return this.newsletter.subscribe(dto, client);
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe using the token from an email footer.' })
  async unsubscribe(@Body() dto: NewsletterUnsubscribeDto): Promise<{ unsubscribed: boolean }> {
    return this.newsletter.unsubscribe(dto.token);
  }
}

@ApiTags('Admin · Newsletter')
@Controller('admin/newsletter')
export class AdminNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get('subscribers')
  @RequirePermissions('newsletter:read')
  async list(@Query() query: PaginationQueryDto): Promise<Paginated<NewsletterSubscriberDto>> {
    return this.newsletter.list(query);
  }
}
