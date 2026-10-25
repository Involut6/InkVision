import type { Readable } from 'node:stream';

export interface StoredObject {
  readonly key: string;
  readonly sizeBytes: number;
  readonly checksum: string;
}

export interface PutObjectInput {
  /** Driver-relative key, e.g. `products/blueprint-v1.pdf`. */
  readonly key: string;
  readonly body: Buffer;
  readonly contentType: string;
}

/**
 * Storage abstraction.
 *
 * The important property is that nothing it stores is reachable over HTTP
 * directly. Reads go through the API, which applies authorisation first, so a
 * paid deliverable can never be guessed by URL.
 */
export interface StorageDriver {
  readonly name: string;
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<{ stream: Readable; sizeBytes: number } | null>;
  getBuffer(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
