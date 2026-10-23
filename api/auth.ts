/**
 * Xác thực Admin phía máy chủ (Vercel Serverless Function).
 *
 *   POST /api/auth?action=login    { username, password, remember }  -> đặt cookie phiên
 *   GET  /api/auth?action=session                                      -> thông tin người đang đăng nhập
 *   POST /api/auth?action=logout                                       -> xóa cookie phiên
 *
 * Biến môi trường (Vercel → Settings → Environment Variables):
 *   ADMIN_PASSWORD  (bắt buộc) mật khẩu Admin
 *   ADMIN_USERNAME  (tùy chọn) tên đăng nhập, mặc định "Admin"
 *   AUTH_SECRET     (tùy chọn) khóa ký phiên; nếu bỏ trống sẽ suy ra từ ADMIN_PASSWORD,
 *                   nên đổi mật khẩu sẽ tự đăng xuất mọi thiết bị.
 *
 * Toàn bộ logic nằm trong một file để tránh lỗi import ESM khi Vercel đóng gói.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Req = IncomingMessage & { body?: unknown };

const COOKIE_NAME = 'deadline_session';
const SESSION_SHORT_SECONDS = 12 * 60 * 60; // không ghi nhớ: 12 giờ
const SESSION_LONG_SECONDS = 30 * 24 * 60 * 60; // ghi nhớ: 30 ngày
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 5 * 60;

interface SessionPayload {
  u: string;
  iat: number;
  exp: number;
}

function getConfig() {
  const username = (process.env.ADMIN_USERNAME || 'Admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.AUTH_SECRET || (password ? `deadline-session:${password}` : '');
  return { username, password, secret };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** So sánh chuỗi trong thời gian cố định để không lộ mật khẩu qua thời gian phản hồi. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

function sign(payload: SessionPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token: string, secret: string): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || !secret) return null;
  const expected = b64url(createHmac('sha256', secret).update(body).digest());
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(req: Req, name: string): string | null {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function isHttps(req: Req): boolean {
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function setSessionCookie(res: ServerResponse, req: Req, value: string, maxAge: number | null) {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (isHttps(req)) parts.push('Secure');
  if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function userFromPayload(p: SessionPayload) {
  return {
    username: p.u,
    fullName: 'Quản trị viên Hệ thống',
    role: 'Quản trị viên (Admin)',
    loggedInAt: new Date(p.iat * 1000).toISOString(),
  };
}

// Giới hạn số lần nhập sai (theo từng phiên máy chủ; giảm tốc độ dò mật khẩu).
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function clientKey(req: Req): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: Req, res: ServerResponse) {
  const action = new URL(req.url || '/', 'http://localhost').searchParams.get('action') || 'session';
  const { username, password, secret } = getConfig();

  if (action === 'session') {
    const token = readCookie(req, COOKIE_NAME);
    const payload = token ? verify(token, secret) : null;
    if (!payload || payload.u !== username) {
      return send(res, 401, { ok: false });
    }
    return send(res, 200, { ok: true, user: userFromPayload(payload) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, message: 'Phương thức không hợp lệ' });
  }

  if (action === 'logout') {
    setSessionCookie(res, req, '', 0);
    return send(res, 200, { ok: true });
  }

  if (action === 'login') {
    if (!password) {
      return send(res, 503, {
        ok: false,
        message: 'Máy chủ chưa được cấu hình mật khẩu Admin (biến ADMIN_PASSWORD trên Vercel).',
      });
    }

    const key = clientKey(req);
    const now = Date.now();
    const record = failedAttempts.get(key);
    if (record && record.lockedUntil > now) {
      const minutes = Math.ceil((record.lockedUntil - now) / 60000);
      return send(res, 429, {
        ok: false,
        message: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      });
    }

    const body = await readJsonBody(req);
    const inputUser = String(body.username || '').trim();
    const inputPass = String(body.password || '');
    const remember = body.remember !== false;

    if (!inputUser || !inputPass) {
      return send(res, 400, { ok: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const userOk = inputUser.toLowerCase() === username.toLowerCase();
    const passOk = safeEqual(inputPass, password);

    if (!userOk || !passOk) {
      const count = (record?.count || 0) + 1;
      failedAttempts.set(key, {
        count: count >= MAX_FAILED_ATTEMPTS ? 0 : count,
        lockedUntil: count >= MAX_FAILED_ATTEMPTS ? now + LOCK_SECONDS * 1000 : 0,
      });
      await new Promise((r) => setTimeout(r, 400));
      const left = MAX_FAILED_ATTEMPTS - count;
      return send(res, 401, {
        ok: false,
        message:
          left > 0
            ? `Tên đăng nhập hoặc mật khẩu không chính xác (còn ${left} lần thử)`
            : `Nhập sai quá nhiều lần. Tài khoản tạm khóa ${LOCK_SECONDS / 60} phút.`,
      });
    }

    failedAttempts.delete(key);
    const iat = Math.floor(now / 1000);
    const lifetime = remember ? SESSION_LONG_SECONDS : SESSION_SHORT_SECONDS;
    const payload: SessionPayload = { u: username, iat, exp: iat + lifetime };
    setSessionCookie(res, req, sign(payload, secret), remember ? lifetime : null);
    return send(res, 200, { ok: true, user: userFromPayload(payload) });
  }

  return send(res, 404, { ok: false, message: 'Không tìm thấy' });
}
