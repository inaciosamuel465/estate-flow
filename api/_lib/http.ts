import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from './auth.js';

export type ApiUser = { id: string; email: string; role: string; company_id?: string };

export function ok(res: VercelResponse, data: Record<string, unknown> = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}

export function fail(res: VercelResponse, status: number, error: string, details?: unknown) {
  return res.status(status).json({ success: false, error, ...(details ? { details } : {}) });
}

export function getSql() {
  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) throw new Error('DB not configured');
  return neon(dbUrl);
}

export function requireAuth(req: VercelRequest): ApiUser {
  const user = verifyRequest(req);
  if (!user) throw Object.assign(new Error('Nao autorizado'), { statusCode: 401 });
  return user;
}

export function requireRole(user: ApiUser, roles: string[]) {
  if (!roles.includes(user.role)) {
    throw Object.assign(new Error('Sem permissao'), { statusCode: 403 });
  }
}

export function requireTenant(req: VercelRequest, user?: ApiUser): string {
  const companyId = String(req.body?.company_id || req.query.company_id || user?.company_id || '');
  if (!companyId) throw Object.assign(new Error('company_id obrigatorio'), { statusCode: 400 });
  return companyId;
}

export function assertTenantAccess(user: ApiUser, companyId: string) {
  if (['master', 'superadmin'].includes(user.role) || (user.role === 'admin' && !user.company_id)) return;
  if (user.company_id && user.company_id === companyId) return;
  throw Object.assign(new Error('Tenant invalido'), { statusCode: 403 });
}

export async function auditLog(sql: ReturnType<typeof neon>, input: {
  companyId: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
}) {
  try {
    await sql`
      INSERT INTO activity_log (company_id, user_id, user_name, action, entity_type, entity_id, description)
      VALUES (${input.companyId}, ${input.userId || null}, ${input.userName || 'Sistema'}, ${input.action}, ${input.entityType || null}, ${input.entityId || null}, ${input.description || null})
    `;
  } catch (error) {
    console.warn('auditLog failed:', error);
  }
}

export function handleApiError(res: VercelResponse, error: unknown) {
  const err = error as Error & { statusCode?: number };
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  return fail(res, status, err.message || 'Erro interno');
}
