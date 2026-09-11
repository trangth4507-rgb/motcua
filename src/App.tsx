import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';
import { fetchSheetData, SheetRecord, SHEET_ID_DEFAULT } from './lib/sheets';
import { RecordTable } from './components/RecordTable';
import { FileSpreadsheet, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [spreadsheetId, setSpreadsheetId] = useState(SHEET_ID_DEFAULT);
  const [sheetName, setSheetName] = useState('');
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
        setNeedsAuth(false);
        loadData(token, spreadsheetId);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setAccessToken('');
        setRecords([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadData = async (tokenStr?: string, sid: string = spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = tokenStr || await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsLoading(false);
        return;
      }
      setAccessToken(token);
      
      const { records: data, sheetName: sName, error: err } = await fetchSheetData(token, sid);
      if (err) {
        setError(err);
      } else {
        setRecords(data);
        setSheetName(sName);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        loadData(result.accessToken, spreadsheetId);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError('Đăng nhập thất bại: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
    setUser(null);
    setAccessToken('');
    setRecords([]);
  };

  const handleRefresh = () => {
    loadData();
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Hệ Thống Quản Lý Hồ Sơ</h1>
          <p className="text-slate-600 mb-8">Vui lòng đăng nhập bằng tài khoản Google để truy cập dữ liệu quản lý và nhắc hạn hồ sơ.</p>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full relative flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-4 py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 rounded-full border-2 border-slate-400 border-t-slate-800 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            <span>Tiếp tục với Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Quản Lý Hồ Sơ</h1>
              <p className="text-xs text-slate-500 font-medium">Đồng bộ 2 chiều Google Sheets</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200" />
              )}
              <div className="hidden sm:block text-sm">
                <div className="font-medium text-slate-900">{user?.displayName}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <button 
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-6 py-6 flex flex-col gap-6 max-w-full">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
          <div className="flex-1 w-full max-w-2xl">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Nguồn dữ liệu (Google Spreadsheet ID)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Nhập Spreadsheet ID..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
              />
              <button
                onClick={() => loadData(undefined, spreadsheetId)}
                disabled={isLoading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Tải lại đồng bộ</span>
              </button>
            </div>
          </div>
          
          <div className="text-sm text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Trang tính hiện tại: <span className="font-semibold text-slate-800">{sheetName || 'Đang tải...'}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Lỗi khi tải dữ liệu</div>
              <div className="text-sm opacity-90">{error}</div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <h2 className="font-semibold text-slate-800 text-lg">Danh sách nhắc hạn hồ sơ</h2>
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 shadow-sm">
              Đang theo dõi {records.length} hồ sơ
            </div>
          </div>
          
          {isLoading && records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4" />
              <p className="font-medium">Đang đồng bộ dữ liệu từ Google Sheets...</p>
            </div>
          ) : (
            <div className="flex-1 p-0 overflow-auto">
              <RecordTable 
                records={records} 
                accessToken={accessToken}
                spreadsheetId={spreadsheetId}
                sheetName={sheetName}
                onRefresh={handleRefresh}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

