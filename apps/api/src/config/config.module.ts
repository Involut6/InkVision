import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { AppConfigService } from './configuration.js';
import { validateEnv } from './env.validation.js';

/**
 * Global configuration module. Loads `.env` files in order of increasing
 * specificity and validates the result before anything else boots.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Later entries win. The repository-root file holds shared development
      // defaults; the app-local file holds per-service overrides.
      envFilePath: ['../../.env', '.env', '.env.local'],
      validate: validateEnv,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
