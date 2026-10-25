import { Injectable } from '@nestjs/common';

import type { PublicSiteSettingsDto, SocialProfile } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ResourceNotFoundException } from '../../common/errors/app.errors.js';
import { AuditService } from '../audit/audit.service.js';
import { toImageRef } from '../content/mappers/media.mapper.js';

import type { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/** The settings row is a singleton pinned to this id. */
const SETTINGS_ID = 1;

@Injectable()
export class SiteSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public settings.
   *
   * `commerceEnabled` and `schedulingUrl` are resolved from server
   * configuration rather than the database, so the site can never advertise a
   * capability the running deployment does not actually have.
   */
  async getPublic(): Promise<PublicSiteSettingsDto> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
      include: { logo: true, defaultOgImage: true },
    });

    if (!row) throw new ResourceNotFoundException('Site settings');

    const awaitingReview = await this.prisma.legalPage.count({ where: { awaitingReview: true } });

    return {
      siteName: row.siteName,
      tagline: row.tagline,
      supportingStatement: row.supportingStatement,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      addressLines: row.addressLines,
      socialProfiles: parseSocialProfiles(row.socialProfiles),
      newsletterEnabled: row.newsletterEnabled,
      newsletterHeadline: row.newsletterHeadline,
      newsletterBody: row.newsletterBody,
      schedulingUrl: this.config.scheduling.enabled
        ? (this.config.scheduling.embedUrl ?? row.schedulingUrl)
        : null,
      commerceEnabled: this.config.commerce.enabled,
      defaultSeoTitle: row.defaultSeoTitle,
      defaultSeoDescription: row.defaultSeoDescription,
      defaultOgImage: toImageRef(row.defaultOgImage, this.config),
      legalEntityName: row.legalEntityName,
      legalPagesAwaitingReview: awaitingReview > 0,
    };
  }

  async getForAdmin() {
    const row = await this.prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
      include: { logo: true, defaultOgImage: true },
    });
    if (!row) throw new ResourceNotFoundException('Site settings');

    return {
      ...row,
      socialProfiles: parseSocialProfiles(row.socialProfiles),
      // Surfaced so an operator can see what the deployment actually permits,
      // separately from what the CMS holds.
      runtime: {
        commerceEnabled: this.config.commerce.enabled,
        paymentProvider: this.config.commerce.provider,
        paymentCurrency: this.config.commerce.currency,
        emailProvider: this.config.mail.provider,
        notificationRecipient: this.config.mail.notificationsTo ?? null,
        schedulingEnabled: this.config.scheduling.enabled,
        storageDriver: this.config.storage.driver,
      },
    };
  }

  async update(dto: UpdateSiteSettingsDto, actor: AuthenticatedUser) {
    await this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.siteName !== undefined ? { siteName: dto.siteName } : {}),
        ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
        ...(dto.supportingStatement !== undefined
          ? { supportingStatement: dto.supportingStatement }
          : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
        ...(dto.addressLines !== undefined ? { addressLines: dto.addressLines } : {}),
        ...(dto.socialProfiles !== undefined
          ? { socialProfiles: dto.socialProfiles as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.newsletterEnabled !== undefined
          ? { newsletterEnabled: dto.newsletterEnabled }
          : {}),
        ...(dto.newsletterHeadline !== undefined
          ? { newsletterHeadline: dto.newsletterHeadline }
          : {}),
        ...(dto.newsletterBody !== undefined ? { newsletterBody: dto.newsletterBody } : {}),
        ...(dto.notificationEmail !== undefined
          ? { notificationEmail: dto.notificationEmail }
          : {}),
        ...(dto.schedulingUrl !== undefined ? { schedulingUrl: dto.schedulingUrl } : {}),
        ...(dto.defaultSeoTitle !== undefined ? { defaultSeoTitle: dto.defaultSeoTitle } : {}),
        ...(dto.defaultSeoDescription !== undefined
          ? { defaultSeoDescription: dto.defaultSeoDescription }
          : {}),
        ...(dto.logoId !== undefined ? { logoId: dto.logoId } : {}),
        ...(dto.defaultOgImageId !== undefined ? { defaultOgImageId: dto.defaultOgImageId } : {}),
        ...(dto.legalEntityName !== undefined ? { legalEntityName: dto.legalEntityName } : {}),
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'site_settings.updated',
      entityType: 'SiteSettings',
      entityId: String(SETTINGS_ID),
      summary: `${actor.email} updated site settings`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.getForAdmin();
  }
}

/**
 * Defensive parse of the JSON column. A malformed entry is skipped rather than
 * throwing, so one bad row cannot take the whole site down.
 */
function parseSocialProfiles(value: unknown): SocialProfile[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.platform !== 'string' || typeof record.url !== 'string') return [];

    return [
      {
        platform: record.platform,
        url: record.url,
        label: typeof record.label === 'string' ? record.label : record.platform,
      },
    ];
  });
}
