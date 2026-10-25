import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  API,
  createAdminUser,
  createTestHarness,
  resetDatabase,
  seedSiteSettings,
  type TestHarness,
} from './harness.js';

/**
 * Authentication and authorisation.
 *
 * These test the controls themselves rather than the screens in front of them:
 * admin endpoints must refuse an anonymous caller, roles must be enforced by
 * the server, and a rotated refresh token must not be usable twice.
 */
describe('admin authentication and authorisation', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await createTestHarness();
  }, 60_000);

  afterAll(async () => {
    await harness.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(harness.prisma);
    await seedSiteSettings(harness.prisma);
  });

  const server = () => harness.app.getHttpServer();

  describe('unauthenticated access', () => {
    it.each([
      ['GET', '/admin/enquiries'],
      ['GET', '/admin/dashboard'],
      ['GET', '/admin/articles'],
      ['GET', '/admin/products'],
      ['GET', '/admin/users'],
      ['GET', '/admin/site-settings'],
      ['GET', '/admin/audit-log'],
    ])('refuses %s %s with 401', async (method, path) => {
      const response = await request(server())
        [method.toLowerCase() as 'get'](`${API}${path}`)
        .expect(401);

      expect(response.body.code).toBe('UNAUTHENTICATED');
    });

    it('refuses a forged bearer token', async () => {
      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(401);
    });

    it('refuses a token signed with the wrong secret', async () => {
      // A refresh token presented where an access token is expected: correctly
      // signed, wrong key and wrong type.
      const { email, password } = await createAdminUser(harness);
      const login = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(200);

      const refreshCookie = extractCookie(login, 'inkvision_refresh');
      const refreshToken = refreshCookie?.split('=')[1]?.split(';')[0] ?? '';

      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('sign in', () => {
    it('issues an access token and sets HttpOnly session cookies', async () => {
      const { email, password } = await createAdminUser(harness);

      const response = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(200);

      expect(response.body.accessToken).toBeTypeOf('string');
      expect(response.body.user.role).toBe('OWNER');
      expect(response.body.user.permissions.length).toBeGreaterThan(0);

      const cookies = (response.headers['set-cookie'] as unknown as string[]) ?? [];
      const access = cookies.find((c) => c.startsWith('inkvision_access='));
      const refresh = cookies.find((c) => c.startsWith('inkvision_refresh='));
      const csrf = cookies.find((c) => c.startsWith('inkvision_csrf='));

      expect(access).toContain('HttpOnly');
      expect(refresh).toContain('HttpOnly');
      // The CSRF cookie is readable on purpose: the client echoes it back.
      expect(csrf).not.toContain('HttpOnly');
    });

    it('never returns the password hash', async () => {
      const { email, password } = await createAdminUser(harness);
      const response = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('$argon2');
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('gives the same answer for a wrong password and an unknown account', async () => {
      const { email } = await createAdminUser(harness);

      const wrongPassword = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password: 'definitely-not-the-password' })
        .expect(401);

      const unknownAccount = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email: 'nobody@test.local', password: 'definitely-not-the-password' })
        .expect(401);

      // Identical responses: the endpoint cannot be used to enumerate accounts.
      expect(wrongPassword.body.message).toBe(unknownAccount.body.message);
      expect(wrongPassword.body.code).toBe(unknownAccount.body.code);
    });

    it('locks an account after repeated failures', async () => {
      const { email, id } = await createAdminUser(harness);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(server())
          .post(`${API}/admin/auth/login`)
          .send({ email, password: `wrong-${attempt}` });
      }

      const user = await harness.prisma.adminUser.findUniqueOrThrow({ where: { id } });
      expect(user.failedLoginAttempts).toBeGreaterThanOrEqual(5);
      expect(user.lockedUntil).not.toBeNull();
      expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('refuses a deactivated account', async () => {
      const { email, password, id } = await createAdminUser(harness);
      await harness.prisma.adminUser.update({ where: { id }, data: { isActive: false } });

      const response = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });
  });

  describe('refresh token rotation', () => {
    it('issues a new pair and invalidates the presented token', async () => {
      const { email, password } = await createAdminUser(harness);
      const login = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(200);

      const firstRefresh = extractCookie(login, 'inkvision_refresh')!;

      const rotated = await request(server())
        .post(`${API}/admin/auth/refresh`)
        .set('Cookie', firstRefresh)
        .expect(200);

      expect(rotated.body.accessToken).toBeTypeOf('string');
      expect(rotated.body.accessToken).not.toBe(login.body.accessToken);
      expect(extractCookie(rotated, 'inkvision_refresh')).not.toBe(firstRefresh);

      // Replaying the original token must fail: that is the theft signal.
      await request(server())
        .post(`${API}/admin/auth/refresh`)
        .set('Cookie', firstRefresh)
        .expect(401);
    });

    it('revokes the whole session family when a rotated token is replayed', async () => {
      const { email, password } = await createAdminUser(harness);
      const login = await request(server())
        .post(`${API}/admin/auth/login`)
        .send({ email, password })
        .expect(200);

      const firstRefresh = extractCookie(login, 'inkvision_refresh')!;
      const rotated = await request(server())
        .post(`${API}/admin/auth/refresh`)
        .set('Cookie', firstRefresh)
        .expect(200);

      const secondRefresh = extractCookie(rotated, 'inkvision_refresh')!;

      // Replay the stolen first token …
      await request(server())
        .post(`${API}/admin/auth/refresh`)
        .set('Cookie', firstRefresh)
        .expect(401);

      // … and the legitimate successor is revoked along with it.
      await request(server())
        .post(`${API}/admin/auth/refresh`)
        .set('Cookie', secondRefresh)
        .expect(401);
    });

    it('rejects a refresh with no cookie at all', async () => {
      await request(server()).post(`${API}/admin/auth/refresh`).expect(401);
    });
  });

  describe('role-based authorisation', () => {
    it('allows an enquiry manager to read enquiries', async () => {
      const { email, password } = await createAdminUser(harness, {
        email: 'manager@test.local',
        role: 'ENQUIRY_MANAGER',
      });

      const token = await signIn(harness, email, password);

      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('refuses an enquiry manager access to the article CMS', async () => {
      const { email, password } = await createAdminUser(harness, {
        email: 'manager@test.local',
        role: 'ENQUIRY_MANAGER',
      });

      const token = await signIn(harness, email, password);

      const response = await request(server())
        .get(`${API}/admin/articles`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    });

    it('refuses an editor access to enquiries', async () => {
      const { email, password } = await createAdminUser(harness, {
        email: 'editor@test.local',
        role: 'EDITOR',
      });

      const token = await signIn(harness, email, password);

      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('refuses an editor the enquiry CSV export', async () => {
      const { email, password } = await createAdminUser(harness, {
        email: 'editor@test.local',
        role: 'EDITOR',
      });

      const token = await signIn(harness, email, password);

      await request(server())
        .get(`${API}/admin/enquiries/export`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('applies a role change immediately, without waiting for the token to expire', async () => {
      const { email, password, id } = await createAdminUser(harness, { role: 'OWNER' });
      const token = await signIn(harness, email, password);

      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await harness.prisma.adminUser.update({ where: { id }, data: { role: 'EDITOR' } });

      // Same, still-valid token — the guard re-reads the user on every request.
      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects a token belonging to a deactivated account', async () => {
      const { email, password, id } = await createAdminUser(harness);
      const token = await signIn(harness, email, password);

      await harness.prisma.adminUser.update({ where: { id }, data: { isActive: false } });

      await request(server())
        .get(`${API}/admin/enquiries`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('audit trail', () => {
    it('records a sign-in', async () => {
      const { email, password } = await createAdminUser(harness);
      await request(server()).post(`${API}/admin/auth/login`).send({ email, password }).expect(200);

      const entries = await harness.prisma.auditLog.findMany({ where: { action: 'auth.login' } });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.actorEmail).toBe(email);
    });
  });
});

function extractCookie(response: request.Response, name: string): string | undefined {
  const cookies = (response.headers['set-cookie'] as unknown as string[]) ?? [];
  return cookies.find((cookie) => cookie.startsWith(`${name}=`));
}

async function signIn(harness: TestHarness, email: string, password: string): Promise<string> {
  const response = await request(harness.app.getHttpServer())
    .post(`${API}/admin/auth/login`)
    .send({ email, password })
    .expect(200);

  return response.body.accessToken as string;
}
