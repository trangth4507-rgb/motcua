import React, { useState, useEffect } from 'react';
import { fetchSheetData, SheetRecord, WEB_APP_URL_DEFAULT } from './lib/sheets';
import { RecordTable } from './components/RecordTable';
import { FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [webAppUrl, setWebAppUrl] = useState(WEB_APP_URL_DEFAULT);
  const [sheetName, setSheetName] = useState('');
  const [records, setRecords] = useState<SheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webAppUrl) {
      loadData(webAppUrl);
    }
  }, []);

  const loadData = async (url: string = webAppUrl) => {
    if (!url) {
      setError('Vui lòng nhập Web App URL');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { records: data, sheetName: sName, error: err } = await fetchSheetData(url);
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

  const handleRefresh = () => {
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Deadline</h1>
              <p className="text-xs text-slate-500 font-medium">Đồng bộ 2 chiều Google Sheets qua Apps Script</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-6 py-6 flex flex-col gap-6 max-w-full">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
          <div className="flex-1 w-full max-w-2xl">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Cấu hình Web App URL (Apps Script)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="Nhập URL của Web App (bắt đầu bằng https://script.google.com/...)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
              />
              <button
                onClick={() => loadData(webAppUrl)}
                disabled={isLoading || !webAppUrl}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Tải lại dữ liệu</span>
              </button>
            </div>
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
              <p className="font-medium">Đang kết nối đến Apps Script...</p>
            </div>
          ) : !webAppUrl && records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <p className="font-medium">Vui lòng nhập Web App URL để bắt đầu</p>
            </div>
          ) : (
            <div className="flex-1 p-0 overflow-auto">
              <RecordTable 
                records={records} 
                webAppUrl={webAppUrl}
                onRefresh={handleRefresh}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

