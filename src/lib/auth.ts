export interface AuthUser {
  username: string;
  fullName: string;
  role: string;
  loggedInAt: string;
}

const AUTH_ENDPOINT = '/api/auth';

/** Trang quản lý biến môi trường của dự án trên Vercel (nơi đặt/đổi mật khẩu Admin). */
export const VERCEL_ENV_SETTINGS_URL =
  'https://vercel.com/trangth4508s-projects/motcua/settings/environment-variables';

// Khóa cũ từ phiên bản lưu mật khẩu trong trình duyệt — xóa đi để không còn dấu vết.
function clearLegacyStorage() {
  try {
    localStorage.removeItem('deadline_auth_user');
    localStorage.removeItem('deadline_admin_password');
  } catch {
    /* bỏ qua */
  }
}

async function parseJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/** Hỏi máy chủ xem trình duyệt này đang có phiên đăng nhập hợp lệ không. */
export async function fetchSession(): Promise<AuthUser | null> {
  clearLegacyStorage();
  try {
    const res = await fetch(`${AUTH_ENDPOINT}?action=session`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await parseJson(res);
    return data.ok && data.user ? (data.user as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function authenticate(
  username: string,
  password: string,
  remember: boolean
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  if (!username.trim()) return { success: false, message: 'Vui lòng nhập tên đăng nhập' };
  if (!password) return { success: false, message: 'Vui lòng nhập mật khẩu' };

  try {
    const res = await fetch(`${AUTH_ENDPOINT}?action=login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password, remember }),
    });
    const data = await parseJson(res);
    if (res.ok && data.ok && data.user) {
      return { success: true, user: data.user as AuthUser };
    }
    return {
      success: false,
      message: data.message || 'Tên đăng nhập hoặc mật khẩu không chính xác',
    };
  } catch {
    return { success: false, message: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.' };
  }
}

export async function logout(): Promise<void> {
  clearLegacyStorage();
  try {
    await fetch(`${AUTH_ENDPOINT}?action=logout`, { method: 'POST', credentials: 'same-origin' });
  } catch (e) {
    console.warn('Logout error:', e);
  }
}
