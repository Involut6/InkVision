import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AppException,
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { slugify } from '../../common/utils/slug.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../storage/storage.types.js';
import { AuditService } from '../audit/audit.service.js';

import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Upload allowlist.
 *
 * Both the declared MIME type and the file's own magic bytes must agree. A
 * declared type alone is attacker-controlled, so it is never the only check.
 */
const IMAGE_TYPES: Readonly<Record<string, { extension: string; magic: readonly number[][] }>> = {
  'image/jpeg': { extension: 'jpg', magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { extension: 'png', magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  'image/webp': { extension: 'webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  'image/avif': { extension: 'avif', magic: [[0x00, 0x00, 0x00]] },
  'image/svg+xml': { extension: 'svg', magic: [] },
};

const DOCUMENT_TYPES: Readonly<Record<string, { extension: string; magic: readonly number[][] }>> =
  {
    'application/pdf': { extension: 'pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
    'application/epub+zip': { extension: 'epub', magic: [[0x50, 0x4b, 0x03, 0x04]] },
    'application/zip': { extension: 'zip', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  };

export interface UploadInput {
  readonly originalName: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
  readonly alt?: string;
  readonly caption?: string;
  /** Private assets (product deliverables) are never exposed publicly. */
  readonly isPublic: boolean;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  async upload(input: UploadInput, actor: AuthenticatedUser) {
    this.validate(input);

    const allowed = { ...IMAGE_TYPES, ...DOCUMENT_TYPES }[input.mimeType]!;
    const base = slugify(input.originalName.replace(/\.[^.]+$/, '')) || 'file';
    const checksumPrefix = createHash('sha256').update(input.buffer).digest('hex').slice(0, 12);
    const folder = input.isPublic ? 'public' : 'private';
    const key = `${folder}/${base}-${checksumPrefix}.${allowed.extension}`;

    const stored = await this.storage.put({
      key,
      body: input.buffer,
      contentType: input.mimeType,
    });

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey: stored.key,
        driver: this.storage.name,
        mimeType: input.mimeType,
        sizeBytes: stored.sizeBytes,
        alt: input.alt ?? null,
        caption: input.caption ?? null,
        checksum: stored.checksum,
        isPublic: input.isPublic,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'media.uploaded',
      entityType: 'MediaAsset',
      entityId: asset.id,
      summary: `Uploaded ${input.isPublic ? 'public' : 'private'} asset ${key}`,
      metadata: { mimeType: input.mimeType, sizeBytes: stored.sizeBytes },
    });

    return asset;
  }

  /**
   * Streams a PUBLIC asset. Private assets are refused here regardless of the
   * id presented — they have their own authorised route.
   */
  async streamPublic(
    id: string,
  ): Promise<{ stream: Readable; mimeType: string; sizeBytes: number }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new ResourceNotFoundException('Media asset', id);

    if (!asset.isPublic) {
      // Reported as not-found rather than forbidden: a 403 would confirm that a
      // private asset exists at that id.
      throw new ResourceNotFoundException('Media asset', id);
    }

    const handle = await this.storage.get(asset.storageKey);
    if (!handle) throw new ResourceNotFoundException('Media asset', id);

    return { stream: handle.stream, mimeType: asset.mimeType, sizeBytes: handle.sizeBytes };
  }

  /** Loads a private asset for an already-authorised caller. */
  async readPrivate(
    assetId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; sizeBytes: number }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new ResourceNotFoundException('Asset', assetId);

    const buffer = await this.storage.getBuffer(asset.storageKey);
    if (!buffer) throw new ResourceNotFoundException('Asset file', assetId);

    return { buffer, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes };
  }

  async list(onlyPublic = false) {
    return this.prisma.mediaAsset.findMany({
      ...(onlyPublic ? { where: { isPublic: true } } : {}),
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        alt: true,
        caption: true,
        isPublic: true,
        createdAt: true,
      },
    });
  }

  private validate(input: UploadInput): void {
    const problems: Record<string, string[]> = {};

    if (input.buffer.byteLength === 0) {
      problems.file = ['The uploaded file is empty.'];
    }

    if (input.buffer.byteLength > this.config.storage.maxUploadBytes) {
      const limitMb = Math.round(this.config.storage.maxUploadBytes / (1024 * 1024));
      throw new AppException('PAYLOAD_TOO_LARGE', 413, `Files must be ${limitMb} MB or smaller.`);
    }

    const allowed = { ...IMAGE_TYPES, ...DOCUMENT_TYPES }[input.mimeType];
    if (!allowed) {
      throw new AppException(
        'UNSUPPORTED_MEDIA_TYPE',
        415,
        `Files of type ${input.mimeType} are not accepted.`,
      );
    }

    // An SVG is executable markup, so it is only ever stored as a private
    // asset: serving one from the site's own origin is a stored-XSS vector.
    if (input.mimeType === 'image/svg+xml' && input.isPublic) {
      problems.mimeType = [
        'SVG uploads are not served publicly. Convert the artwork to PNG, WebP or AVIF.',
      ];
    }

    if (allowed.magic.length > 0 && !this.matchesMagicBytes(input.buffer, allowed.magic)) {
      problems.file = [`The file contents do not match the declared type (${input.mimeType}).`];
    }

    if (Object.keys(problems).length > 0) throw new ValidationFailedException(problems);
  }

  private matchesMagicBytes(buffer: Buffer, signatures: readonly number[][]): boolean {
    return signatures.some((signature) => signature.every((byte, index) => buffer[index] === byte));
  }
}
