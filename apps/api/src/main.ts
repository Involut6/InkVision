import { Logger as NestLogger } from '@nestjs/common';

import { createApiApp, describeConfiguration } from './bootstrap.js';
import { AppConfigService } from './config/configuration.js';

/**
 * Entry point for a long-lived server: a container, a VPS, or `pnpm start:api`.
 *
 * Vercel does not use this file — see `api/index.ts`, which configures the same
 * application through `createApiApp()` and hands it to the serverless runtime
 * instead of binding a port.
 */
async function bootstrap(): Promise<void> {
  const app = await createApiApp();
  const config = app.get(AppConfigService);
  const logger = new NestLogger('Bootstrap');

  await app.listen(config.port, config.host);

  logger.log(`InkVision API listening on http://${config.host}:${config.port}`);
  for (const line of describeConfiguration(config)) logger.log(line);
}

void bootstrap().catch((error: unknown) => {
  // Configuration errors land here. They are printed in full because the
  // operator needs the detail, and the process exits non-zero so a supervisor
  // does not treat a misconfigured start as success.
  console.error('\nFailed to start the InkVision API:\n');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
