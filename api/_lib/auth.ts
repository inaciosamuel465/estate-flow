import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'estateflow-dev-secret-change-in-production';

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: payload.exp || Date.now() + 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function verifyRequest(req: { headers: Record<string, string | string[] | undefined> }): { id: string; email: string; role: string } | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = String(auth).replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) return null;
  return { id: payload.id as string, email: payload.email as string, role: payload.role as string };
}
