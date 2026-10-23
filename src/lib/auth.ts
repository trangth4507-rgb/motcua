export interface AuthUser {
  username: string;
  fullName: string;
  role: string;
  loggedInAt: string;
}

const AUTH_USER_KEY = 'deadline_auth_user';
const ADMIN_PASSWORD_KEY = 'deadline_admin_password';
export const DEFAULT_ADMIN_USERNAME = 'Admin';
export const DEFAULT_ADMIN_PASSWORD = 'dcmvss';

export function getStoredAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function authenticate(usernameInput: string, passwordInput: string): { success: boolean; message?: string; user?: AuthUser } {
  const cleanUser = (usernameInput || '').trim();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser) {
    return { success: false, message: 'Vui lòng nhập tên đăng nhập' };
  }
  if (!cleanPass) {
    return { success: false, message: 'Vui lòng nhập mật khẩu' };
  }

  const expectedPass = getStoredAdminPassword();

  // Accept Admin or admin
  const isUsernameMatch = cleanUser.toLowerCase() === DEFAULT_ADMIN_USERNAME.toLowerCase();
  const isPasswordMatch = cleanPass === expectedPass;

  if (!isUsernameMatch || !isPasswordMatch) {
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
  }

  const user: AuthUser = {
    username: DEFAULT_ADMIN_USERNAME,
    fullName: 'Quản trị viên Hệ thống',
    role: 'Quản trị viên (Admin)',
    loggedInAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save auth to localStorage:', e);
  }

  return { success: true, user };
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (e) {
    console.warn('Logout error:', e);
  }
}

export function updateAdminPassword(oldPass: string, newPass: string): { success: boolean; message: string } {
  const currentPass = getStoredAdminPassword();
  if (oldPass !== currentPass) {
    return { success: false, message: 'Mật khẩu hiện tại không đúng' };
  }
  if (!newPass || newPass.trim().length < 4) {
    return { success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự' };
  }

  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPass.trim());
    return { success: true, message: 'Đổi mật khẩu thành công' };
  } catch {
    return { success: false, message: 'Lỗi khi lưu mật khẩu mới' };
  }
}

export function resetAdminPasswordToDefault(): void {
  try {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  } catch (e) {
    console.warn('Reset password error:', e);
  }
}
