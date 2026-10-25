import { Global, Module } from '@nestjs/common';

import { AuditService } from './audit.service.js';

/**
 * Global because almost every write path records an audit entry; threading the
 * import through a dozen modules would add noise without adding clarity.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
