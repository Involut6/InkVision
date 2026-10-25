import { Injectable, Logger } from '@nestjs/common';

import type {
  NewsletterSubscribeResponse,
  NewsletterSubscriberDto,
  Paginated,
} from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ResourceNotFoundException } from '../../common/errors/app.errors.js';
import {
  paginate,
  resolvePagination,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';
import { hashIpAddress, randomToken } from '../../common/utils/crypto.js';
import { MailService } from '../../mail/mail.service.js';
import { buildNewsletterWelcomeEmail } from '../../mail/templates/enquiry.templates.js';

import type { NewsletterSubscribeDto } from './dto/newsletter.dto.js';
import type { ClientContext } from '../../common/decorators/index.js';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * Subscribes an address.
   *
   * Idempotent, and deliberately uninformative about existing subscriptions: an
   * already-subscribed address gets the same success response as a new one, so
   * the form cannot be used to test whether someone is on the list.
   */
  async subscribe(
    dto: NewsletterSubscribeDto,
    client: ClientContext,
  ): Promise<NewsletterSubscribeResponse> {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });

    if (existing?.status === 'SUBSCRIBED') {
      return {
        status: 'SUBSCRIBED',
        message: 'You are on the list. Thank you.',
        alreadySubscribed: true,
      };
    }

    const unsubscribeToken = existing?.unsubscribeToken ?? randomToken(24);

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        fullName: dto.fullName ?? null,
        source: dto.source ?? null,
        status: 'SUBSCRIBED',
        consentAt: now,
        subscribedAt: now,
        unsubscribeToken,
        ipHash: hashIpAddress(client.ipAddress, this.config.auth.csrfSecret),
      },
      update: {
        // Re-subscribing after unsubscribing is allowed and clears the old
        // unsubscribe timestamp.
        fullName: dto.fullName ?? existing?.fullName ?? null,
        status: 'SUBSCRIBED',
        consentAt: now,
        subscribedAt: now,
        unsubscribedAt: null,
      },
    });

    await this.mail.trySend(
      buildNewsletterWelcomeEmail(
        email,
        'InkVision Creatives',
        `${this.config.publicWebUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`,
      ),
    );

    return {
      status: 'SUBSCRIBED',
      message: 'You are on the list. Thank you.',
      alreadySubscribed: false,
    };
  }

  /** One-click unsubscribe by token. Always reports success. */
  async unsubscribe(token: string): Promise<{ unsubscribed: boolean }> {
    const result = await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token, status: { not: 'UNSUBSCRIBED' } },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });

    if (result.count === 0) {
      this.logger.debug('Unsubscribe called with an unknown or already-used token');
    }

    return { unsubscribed: true };
  }

  async list(
    query: PaginationQueryDto & { status?: NewsletterSubscriberDto['status'] },
  ): Promise<Paginated<NewsletterSubscriberDto>> {
    const pagination = resolvePagination(query);
    const where = query.status ? { status: query.status } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        status: row.status,
        source: row.source,
        subscribedAt: row.subscribedAt?.toISOString() ?? null,
        unsubscribedAt: row.unsubscribedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      pagination,
    );
  }

  async countSubscribed(): Promise<number> {
    return this.prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } });
  }

  async findByToken(token: string): Promise<{ email: string }> {
    const row = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { email: true },
    });
    if (!row) throw new ResourceNotFoundException('Subscription');
    return row;
  }
}
