/**
 * Creates the initial (or an additional) administrator account.
 *
 * This exists so that no usable credential ever lives in source control, in a
 * seed script, or in a container image. The password is supplied by the
 * operator at run time — interactively, or through an environment variable for
 * automated provisioning — hashed with Argon2id, and never echoed back.
 *
 * Usage:
 *   pnpm admin:create
 *   pnpm admin:create --email you@example.com --name "Your Name" --role OWNER
 *   ADMIN_PASSWORD='…' pnpm admin:create --email you@example.com --name "Your Name"
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { ADMIN_ROLES, type AdminRole } from '@inkvision/shared-types';

const MIN_PASSWORD_LENGTH = 12;

interface Args {
  email?: string;
  name?: string;
  role?: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) continue;

    if (flag === '--email') args.email = value;
    if (flag === '--name') args.name = value;
    if (flag === '--role') args.role = value;
  }

  return args;
}

async function prompt(question: string, options: { silent?: boolean } = {}): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  try {
    if (!options.silent) {
      return (await rl.question(question)).trim();
    }

    // Suppress echo so a typed password does not appear on screen or in the
    // terminal's scrollback.
    const output = process.stdout;
    const originalWrite = output.write.bind(output);
    output.write(question);
    (output as { write: typeof originalWrite }).write = (
      chunk: string | Uint8Array,
      ...rest: unknown[]
    ) => {
      if (typeof chunk === 'string' && chunk !== '\n' && chunk !== '\r\n') return true;
      return originalWrite(chunk, ...(rest as []));
    };

    const answer = await rl.question('');
    (output as { write: typeof originalWrite }).write = originalWrite;
    output.write('\n');
    return answer.trim();
  } finally {
    rl.close();
  }
}

function validatePassword(password: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (password.length > 256) problems.push('Password must be 256 characters or fewer.');
  if (/^(.)\1+$/.test(password)) problems.push('Password must not be a single repeated character.');
  return problems;
}

async function main(): Promise<void> {
  // Honour the documented "copy .env.example to .env" flow; anything already
  // in the environment wins, which is how a production host overrides it.
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch {
    // No .env file; the variables are expected to come from the environment.
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and try again.');
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const interactive = process.stdin.isTTY === true;

  const email = (args.email ?? (interactive ? await prompt('Email address: ') : '')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('A valid email address is required (pass --email).');
    process.exit(1);
  }

  const fullName = args.name ?? (interactive ? await prompt('Full name: ') : '');
  if (fullName.length < 2) {
    console.error('A full name is required (pass --name).');
    process.exit(1);
  }

  const roleInput = (args.role ?? 'OWNER').toUpperCase();
  if (!(ADMIN_ROLES as readonly string[]).includes(roleInput)) {
    console.error(`Role must be one of: ${ADMIN_ROLES.join(', ')}`);
    process.exit(1);
  }
  const role = roleInput as AdminRole;

  // The environment variable path exists for automated provisioning; the
  // interactive path is the default so a password need never be in a shell
  // history or a CI log.
  let password = process.env.ADMIN_PASSWORD ?? '';

  if (!password) {
    if (!interactive) {
      console.error(
        'No password supplied. Either run this interactively or set ADMIN_PASSWORD for automated provisioning.',
      );
      process.exit(1);
    }

    password = await prompt(`Password (min ${MIN_PASSWORD_LENGTH} characters): `, { silent: true });
    const confirmation = await prompt('Confirm password: ', { silent: true });

    if (password !== confirmation) {
      console.error('Passwords did not match.');
      process.exit(1);
    }
  }

  const problems = validatePassword(password);
  if (problems.length > 0) {
    console.error(`\n${problems.map((problem) => `  • ${problem}`).join('\n')}\n`);
    process.exit(1);
  }

  // Imported lazily so the usage errors above do not pay for loading the
  // native Argon2 binding.
  const { hash } = await import('@node-rs/argon2');
  const passwordHash = await hash(password, {
    algorithm: 2, // Argon2id
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (existing) {
      console.error(
        `\nAn account already exists for ${email}. ` +
          'Use the administration portal to reset its password, or choose another address.\n',
      );
      process.exit(1);
    }

    const created = await prisma.adminUser.create({
      data: { email, fullName, role, passwordHash, isActive: true, mustChangePassword: false },
      select: { id: true, email: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: created.id,
        actorEmail: created.email,
        action: 'admin_user.bootstrapped',
        entityType: 'AdminUser',
        entityId: created.id,
        summary: `Administrator ${created.email} created via the provisioning script with role ${created.role}`,
      },
    });

    console.log(`\n✓ Administrator created: ${created.email} (${created.role})`);
    console.log('  Sign in at /admin/login on the website.\n');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('\nFailed to create the administrator:\n', error);
  process.exit(1);
});
