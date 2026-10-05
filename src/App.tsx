import React, { useState, useEffect, useMemo } from 'react';
import { fetchSheetData, SheetRecord, WEB_APP_URL_DEFAULT } from './lib/sheets';
import { RecordTable } from './components/RecordTable';
import {
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from './lib/utils';
import { parseDate, calculateTimeRemaining } from './lib/dateUtils';

export default function App() {
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem('deadline_webapp_url') || WEB_APP_URL_DEFAULT;
  });
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
      setError('Vui lòng nhập Web App URL của Apps Script');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { records: data, sheetName: sName, error: err } = await fetchSheetData(url);
      if (err) {
        setError(err);
      } else {
        localStorage.setItem('deadline_webapp_url', url);
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

  // Quick stats
  const stats = useMemo(() => {
    const now = new Date();
    let overdue = 0;
    let warning = 0;
    let completed = 0;

    records.forEach((r) => {
      const isCompleted = !!r.traThucTe && r.traThucTe.trim().length > 0;
      if (isCompleted) {
        completed++;
      } else {
        const ngayTra = parseDate(r.ngayTra);
        const tr = calculateTimeRemaining(ngayTra, now);
        if (tr?.isOverdue) {
          overdue++;
        } else if (tr && tr.totalSeconds <= 72 * 3600) {
          warning++;
        }
      }
    });

    return {
      total: records.length,
      overdue,
      warning,
      completed,
      inProgress: records.length - completed,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Deadline</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Một cửa điện tử
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Theo dõi hạn xử lý & nhắc việc hồ sơ Google Sheets
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        {/* Configuration Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Cấu hình Web App URL (Apps Script)</span>
                <span className="text-[10px] font-normal normal-case text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  Tự động lưu bộ nhớ trình duyệt
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="Nhập URL Web App (https://script.google.com/macros/s/.../exec)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
              />
              <button
                onClick={() => loadData(webAppUrl)}
                disabled={isLoading || !webAppUrl}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                <span>{isLoading ? 'Đang tải...' : 'Tải lại dữ liệu'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">Tổng hồ sơ</div>
                <div className="text-lg font-bold text-slate-900">{stats.total}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-red-200 p-3.5 shadow-2xs flex items-center gap-3 bg-red-50/20">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-red-600 font-medium">Quá hạn</div>
                <div className="text-lg font-bold text-red-700">{stats.overdue}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs flex items-center gap-3 bg-amber-50/20">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-amber-700 font-medium">Sắp đến hạn (≤ 3 ngày)</div>
                <div className="text-lg font-bold text-amber-800">{stats.warning}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs flex items-center gap-3 bg-emerald-50/20">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-emerald-700 font-medium">Đã hoàn thành</div>
                <div className="text-lg font-bold text-emerald-800">{stats.completed}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Lỗi khi tải dữ liệu</div>
              <div className="text-xs sm:text-sm mt-0.5 opacity-90">{error}</div>
            </div>
          </div>
        )}

        {/* Table container */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
            <div>
              <h2 className="font-bold text-slate-800 text-base">Danh sách nhắc hạn hồ sơ</h2>
              <p className="text-xs text-slate-500">
                Hiển thị chi tiết STT, Số hồ sơ, Quy trình, Bộ phận hiện tại, Menu hiện tại và thời gian trả kết quả
              </p>
            </div>
            {records.length > 0 && (
              <div className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200">
                Theo dõi {records.length} hồ sơ ({stats.inProgress} đang giải quyết)
              </div>
            )}
          </div>

          {isLoading && records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-500">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4" />
              <p className="font-medium text-sm">Đang kết nối đến Apps Script...</p>
            </div>
          ) : !webAppUrl && records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400 shadow-inner">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Chưa có liên kết dữ liệu</h3>
              <p className="text-sm max-w-md text-slate-500">
                Vui lòng nhập Web App URL của Google Apps Script ở phía trên để tải dữ liệu danh sách hồ sơ.
              </p>
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
