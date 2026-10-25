import { Global, Module } from '@nestjs/common';

import { AppConfigService } from '../config/configuration.js';

import { LocalStorageDriver } from './local.driver.js';
import { S3StorageDriver } from './s3.driver.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage.types.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): StorageDriver => {
        const storage = config.storage;

        if (storage.driver === 's3') {
          // Env validation guarantees these are present when driver === 's3'.
          return new S3StorageDriver({
            bucket: storage.s3.bucket!,
            region: storage.s3.region!,
            accessKeyId: storage.s3.accessKeyId!,
            secretAccessKey: storage.s3.secretAccessKey!,
            ...(storage.s3.endpoint ? { endpoint: storage.s3.endpoint } : {}),
            forcePathStyle: storage.s3.forcePathStyle,
          });
        }

        return new LocalStorageDriver(storage.localRoot);
      },
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
