import type { PutObjectInput, StorageDriver, StoredObject } from './storage.types.js';

export interface S3DriverOptions {
  readonly bucket: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly endpoint?: string;
  readonly forcePathStyle: boolean;
}

/**
 * S3-compatible object storage.
 *
 * NOT IMPLEMENTED — this is a declared integration boundary, not a stub that
 * pretends to work. Selecting `STORAGE_DRIVER=s3` fails loudly at the first
 * call rather than silently losing a file, and the README documents the two
 * steps needed to complete it:
 *
 *   1. `pnpm --filter @inkvision/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
 *   2. Replace each method below with the corresponding SDK command.
 *
 * Everything above this interface — uploads, product deliverables, signed
 * download links — already works against the driver contract, so completing it
 * requires no changes elsewhere.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = 's3';

  constructor(private readonly options: S3DriverOptions) {}

  private notImplemented(operation: string): never {
    throw new Error(
      `S3 storage is not implemented yet (attempted: ${operation} on bucket "${this.options.bucket}"). ` +
        'Install @aws-sdk/client-s3 and complete src/storage/s3.driver.ts, or set STORAGE_DRIVER=local.',
    );
  }

  async put(_input: PutObjectInput): Promise<StoredObject> {
    this.notImplemented('put');
  }

  async get(): Promise<null> {
    this.notImplemented('get');
  }

  async getBuffer(): Promise<Buffer | null> {
    this.notImplemented('getBuffer');
  }

  async delete(): Promise<void> {
    this.notImplemented('delete');
  }

  async exists(): Promise<boolean> {
    this.notImplemented('exists');
  }
}
