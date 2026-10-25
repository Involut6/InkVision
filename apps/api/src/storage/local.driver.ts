import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';

import { Logger } from '@nestjs/common';

import type { PutObjectInput, StorageDriver, StoredObject } from './storage.types.js';

/**
 * Filesystem storage for development and small single-server deployments.
 *
 * The root is deliberately outside any web-served directory: files are only
 * ever read back through an authorised API route.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';

  private readonly logger = new Logger('LocalStorageDriver');
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const path = this.resolveKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    // 0600: readable only by the service account that wrote it.
    await writeFile(path, input.body, { mode: 0o600 });

    return {
      key: input.key,
      sizeBytes: input.body.byteLength,
      checksum: createHash('sha256').update(input.body).digest('hex'),
    };
  }

  async get(
    key: string,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; sizeBytes: number } | null> {
    const path = this.resolveKey(key);

    try {
      const stats = await stat(path);
      if (!stats.isFile()) return null;
      return { stream: createReadStream(path), sizeBytes: stats.size };
    } catch {
      return null;
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const handle = await this.get(key);
    if (!handle) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of handle.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    try {
      await rm(this.resolveKey(key), { force: true });
    } catch (error) {
      this.logger.warn({ err: String(error) }, 'Failed to delete stored object');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const stats = await stat(this.resolveKey(key));
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Resolves a key inside the storage root and refuses anything that escapes
   * it. A key is attacker-influenced data, so `../../etc/passwd` must not
   * resolve; this check is what makes that true rather than assumed.
   */
  private resolveKey(key: string): string {
    if (isAbsolute(key)) {
      throw new Error('Storage keys must be relative');
    }

    const target = resolve(join(this.root, normalize(key)));
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error('Storage key escapes the configured storage root');
    }

    return target;
  }
}
