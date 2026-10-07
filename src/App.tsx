import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchSheetData,
  SheetRecord,
  WEB_APP_URL_DEFAULT,
  saveCompletedOverride,
  removeCompletedOverride,
  saveCompletedOverridesBatch,
  clearAllCompletedOverrides,
  getDemoRecords,
  APPS_SCRIPT_TEMPLATE,
} from './lib/sheets';
import { RecordTable } from './components/RecordTable';
import {
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  X,
  BookOpen,
  Play,
  Pause,
  Activity,
  RotateCcw,
  Trash2,
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
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-refresh continuous loading settings
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('deadline_auto_refresh');
    return saved !== null ? saved === 'true' : true; // Default ON for continuous auto-load
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('deadline_refresh_interval');
    return saved ? Number(saved) : 15; // Default 15 seconds
  });
  const [countdown, setCountdown] = useState<number>(15);

  // Full landscape mode enabled by default for maximum widescreen viewing
  const [isFullLandscape, setIsFullLandscape] = useState<boolean>(() => {
    const saved = localStorage.getItem('deadline_full_landscape');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleLandscape = () => {
    setIsFullLandscape((prev) => {
      const next = !prev;
      localStorage.setItem('deadline_full_landscape', String(next));
      return next;
    });
  };

  const loadData = async (url: string = webAppUrl, silent: boolean = false) => {
    if (!url || !url.trim()) {
      if (!silent) setError('Vui lòng nhập Web App URL của Google Apps Script (kết thúc bằng /exec)');
      return;
    }

    if (silent) {
      setIsAutoRefreshing(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const { records: data, sheetName: sName, error: err } = await fetchSheetData(url);
      if (err) {
        setAutoRefreshEnabled(false);
        // Giữ nguyên webAppUrl trong ô nhập để người dùng không bị mất link và dễ chỉnh sửa
        if (!silent || records.length === 0) {
          setError(err);
        }
        if (records.length === 0) {
          setRecords(getDemoRecords());
          setSheetName('Dữ liệu mô phỏng Một cửa điện tử');
          setLastUpdated(new Date());
        }
      } else {
        localStorage.setItem('deadline_webapp_url', url);
        // Cập nhật toàn bộ danh sách mới nhất vừa lấy từ Google Sheet
        setRecords(data);
        setSheetName(sName);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err: any) {
      setAutoRefreshEnabled(false);
      const msg = err.message || 'Lỗi tải dữ liệu';
      if (!silent || records.length === 0) {
        setError(msg);
      }
      if (records.length === 0) {
        setRecords(getDemoRecords());
        setSheetName('Dữ liệu mô phỏng Một cửa điện tử');
        setLastUpdated(new Date());
      }
    } finally {
      if (silent) {
        setIsAutoRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (webAppUrl) {
      loadData(webAppUrl);
    } else {
      // Nếu chưa có URL, luôn nạp sẵn dữ liệu mẫu để giao diện hiển thị ngay lập tức
      setRecords(getDemoRecords());
      setSheetName('Dữ liệu mô phỏng Một cửa điện tử');
      setLastUpdated(new Date());
    }
  }, []);

  // Continuous auto-load timer effect
  useEffect(() => {
    if (!autoRefreshEnabled || !webAppUrl) return;

    setCountdown(refreshInterval);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData(webAppUrl, true); // true = silent background refresh
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, webAppUrl, refreshInterval]);

  const handleRefresh = () => {
    setCountdown(refreshInterval);
    loadData(webAppUrl);
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('deadline_auto_refresh', String(next));
      if (next) setCountdown(refreshInterval);
      return next;
    });
  };

  const handleIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    localStorage.setItem('deadline_refresh_interval', String(newInterval));
    setCountdown(newInterval);
  };

  const handleClearCompletedCache = () => {
    clearAllCompletedOverrides();
    loadData(webAppUrl);
  };

  const handleClearBadUrl = () => {
    setWebAppUrl('');
    localStorage.removeItem('deadline_webapp_url');
    localStorage.removeItem('deadline_master_webapp_url');
    setError(null);
    setRecords(getDemoRecords());
    setSheetName('Dữ liệu mô phỏng Một cửa điện tử');
    setLastUpdated(new Date());
  };

  const handleLoadDemoData = () => {
    setWebAppUrl('');
    localStorage.removeItem('deadline_webapp_url');
    localStorage.removeItem('deadline_master_webapp_url');
    const demo = getDemoRecords();
    setRecords(demo);
    setSheetName('Dữ liệu mô phỏng Một cửa điện tử');
    setLastUpdated(new Date());
    setError(null);
  };

  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 3000);
  };

  const handleUpdateRecordCompleted = (rowIndex: number, timestampStr: string, soHoSo?: string) => {
    let targetSoHoSo = soHoSo || '';
    setRecords((prev) =>
      prev.map((r) => {
        const isMatch =
          Number(r.rowIndex) === Number(rowIndex) ||
          (soHoSo && r.soHoSo && r.soHoSo.trim() === soHoSo.trim());
        if (isMatch) {
          if (!targetSoHoSo && r.soHoSo) targetSoHoSo = r.soHoSo;
          return {
            ...r,
            traThucTe: timestampStr,
          };
        }
        return r;
      })
    );
    saveCompletedOverride(rowIndex, targetSoHoSo, timestampStr);
  };

  const handleUndoRecordCompleted = (rowIndex: number, soHoSo?: string) => {
    let targetSoHoSo = soHoSo || '';
    setRecords((prev) =>
      prev.map((r) => {
        const isMatch =
          Number(r.rowIndex) === Number(rowIndex) ||
          (soHoSo && r.soHoSo && r.soHoSo.trim() === soHoSo.trim());
        if (isMatch) {
          if (!targetSoHoSo && r.soHoSo) targetSoHoSo = r.soHoSo;
          return {
            ...r,
            traThucTe: '',
          };
        }
        return r;
      })
    );
    removeCompletedOverride(rowIndex, targetSoHoSo);
  };

  const handleUpdateMultipleRecordsCompleted = (rowIndices: number[], timestampStr: string) => {
    const rowSet = new Set(rowIndices.map((i) => Number(i)));
    const affected: { rowIndex: number; soHoSo: string }[] = [];
    setRecords((prev) =>
      prev.map((r) => {
        if (rowSet.has(Number(r.rowIndex))) {
          affected.push({ rowIndex: r.rowIndex, soHoSo: r.soHoSo });
          return {
            ...r,
            traThucTe: timestampStr,
          };
        }
        return r;
      })
    );
    saveCompletedOverridesBatch(affected, timestampStr);
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
        <div
          className={cn(
            'w-full h-16 flex items-center justify-between transition-all duration-200',
            isFullLandscape ? 'px-3 sm:px-6 2xl:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6'
          )}
        >
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
                {isFullLandscape && (
                  <span className="hidden md:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Toàn cảnh (Full Landscape)
                  </span>
                )}
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Tích chọn hàng loạt: SẴN SÀNG
                </span>
                <span className="hidden lg:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                  ⚡ Sắp đến hạn gần nhất: Lên đầu
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Theo dõi hạn xử lý & nhắc việc hồ sơ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {autoRefreshEnabled && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs shadow-2xs"
                title={`Tự động nạp dữ liệu liên tục sau mỗi ${refreshInterval}s`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-900">Auto-load:</span>
                <strong className="font-mono text-emerald-700">
                  {isAutoRefreshing ? 'Đang nạp...' : `${countdown}s`}
                </strong>
              </div>
            )}

            <button
              onClick={toggleLandscape}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-2xs cursor-pointer',
                isFullLandscape
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              )}
              title={
                isFullLandscape
                  ? 'Đang bật chế độ Mở rộng toàn màn hình ngang (Full Landscape). Bấm để thu về chiều rộng chuẩn.'
                  : 'Bấm để mở rộng giao diện toàn màn hình ngang (Full Landscape) hiển thị đầy đủ các cột.'
              }
            >
              {isFullLandscape ? (
                <>
                  <Minimize2 className="w-4 h-4 text-emerald-700" />
                  <span className="hidden sm:inline">Giao diện: <strong>Full Landscape</strong></span>
                  <span className="sm:hidden">Full</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Mở rộng <strong>Full Landscape</strong></span>
                  <span className="sm:hidden">Mở rộng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 w-full py-4 flex flex-col gap-4 transition-all duration-200',
          isFullLandscape ? 'px-3 sm:px-6 2xl:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6'
        )}
      >
        {/* Configuration Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Web App URL (Google Apps Script)</span>
                  <span className="text-[10px] font-normal normal-case text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    ⚡ Tự động cập nhật khi thay đổi dữ liệu Sheet
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[280px]">
                  <input
                    type="text"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="Dán Web App URL của Google Apps Script (kết thúc bằng /exec)..."
                    className="w-full rounded-lg border border-slate-300 pl-3 pr-8 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                  />
                  {webAppUrl && (
                    <button
                      onClick={() => {
                        setWebAppUrl('');
                        localStorage.removeItem('deadline_webapp_url');
                        setError(null);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Xóa URL"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => loadData(webAppUrl)}
                  disabled={isLoading || !webAppUrl}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={cn('w-4 h-4', (isLoading || isAutoRefreshing) && 'animate-spin')} />
                  <span>{isLoading ? 'Đang tải...' : 'Tải lại dữ liệu'}</span>
                </button>
                <button
                  onClick={handleLoadDemoData}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Tải 8 hồ sơ mẫu để thử nghiệm tính năng ngay mà không cần đợi kết nối"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Dùng dữ liệu mẫu</span>
                </button>
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title="Xem hướng dẫn cách liên kết Apps Script"
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Hướng dẫn kết nối</span>
                  <span className="sm:hidden">Hướng dẫn</span>
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="font-semibold text-emerald-700">💡 Cập nhật tức thì:</span>
                  <span>
                    Bất cứ khi nào bạn sửa, xóa, hoặc dán dữ liệu mới vào Google Sheet: Chỉ cần bấm &ldquo;Tải lại dữ liệu&rdquo; (hoặc đợi chu kỳ tự động tải), hệ thống sẽ nạp dữ liệu mới nhất ngay lập tức mà không bao giờ báo lỗi!
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Continuous Auto-Load & Synchronization Bar */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleAutoRefresh}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold border transition-all cursor-pointer shadow-2xs',
                  autoRefreshEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                )}
                title={autoRefreshEnabled ? 'Bấm để tạm dừng tự động tải liên tục' : 'Bấm để bật tự động tải liên tục từ Google Sheets'}
              >
                {autoRefreshEnabled ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Tự động tải liên tục: <strong>ĐANG BẬT</strong></span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tự động tải liên tục: <strong>TẠM DỪNG</strong></span>
                  </>
                )}
              </button>

              {autoRefreshEnabled && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-slate-700">
                  {isAutoRefreshing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Đang nạp dữ liệu mới...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Làm mới sau: <strong className="font-mono text-emerald-700">{countdown}s</strong></span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                <span className="text-[11px] text-slate-500">Chu kỳ:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 giây (Siêu tốc)</option>
                  <option value={15}>15 giây (Chuẩn)</option>
                  <option value={30}>30 giây</option>
                  <option value={60}>1 phút</option>
                </select>
              </div>

              {lastUpdated && (
                <span className="text-[11px] text-slate-500 hidden md:inline">
                  • Cập nhật: <strong className="text-slate-700 font-mono">{lastUpdated.toLocaleTimeString('vi-VN')}</strong> ({records.length} hồ sơ)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearCompletedCache}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                title="Xóa bộ nhớ đệm hoàn thành cục bộ và nạp lại chuẩn 100% theo trạng thái trên Google Sheet (dùng khi bạn vừa thay thế toàn bộ dữ liệu mới trên Sheet)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đồng bộ sạch từ Sheet</span>
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
          <div className="p-4 bg-red-50 text-red-900 rounded-xl border border-red-300 flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-red-900 mb-1 flex flex-wrap items-center gap-2">
                    <span>Thông báo kết nối dữ liệu</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      Đã tự động nạp dữ liệu mẫu để bạn tiếp tục thao tác
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-red-800 whitespace-pre-line leading-relaxed">
                    {error}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors cursor-pointer flex-shrink-0"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/80 pl-8">
              <button
                onClick={handleClearBadUrl}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Xóa bỏ URL cũ bị lỗi này khỏi bộ nhớ trình duyệt để không bao giờ bị báo lỗi lại"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bỏ URL lỗi này khỏi bộ nhớ</span>
              </button>
              <button
                onClick={handleLoadDemoData}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dùng dữ liệu mẫu (Đã sẵn sàng hoạt động)</span>
              </button>
              <button
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-800 border border-red-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Xem hướng dẫn lấy Web App URL</span>
              </button>
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
              <p className="font-medium text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : !webAppUrl && records.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400 shadow-inner">
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Chưa có liên kết dữ liệu</h3>
              <p className="text-sm max-w-md text-slate-500">
                Vui lòng nhập Web App URL ở phía trên để tải dữ liệu danh sách hồ sơ.
              </p>
            </div>
          ) : (
            <div className="flex-1 p-0 overflow-auto">
              <RecordTable
                records={records}
                webAppUrl={webAppUrl}
                onRefresh={handleRefresh}
                onUpdateRecord={handleUpdateRecordCompleted}
                onUndoRecord={handleUndoRecordCompleted}
                onUpdateMultipleRecords={handleUpdateMultipleRecordsCompleted}
              />
            </div>
          )}
        </div>
      </main>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base sm:text-lg">
                  Hướng dẫn kết nối Google Apps Script
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm leading-relaxed">
                <strong className="text-emerald-950 font-bold block mb-1">
                  ⚡ Đồng bộ tự động & Ổn định tuyệt đối:
                </strong>
                Chỉ cần triển khai mã Apps Script này 1 lần vào bảng tính của bạn. Bất cứ khi nào bạn chỉnh sửa, thêm mới hoặc thay thế toàn bộ dữ liệu trong trang tính đó, ứng dụng sẽ tự động cập nhật ngay mà không bao giờ báo lỗi!
              </div>

              {/* Step 1 */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <span>Mở Apps Script trên Google Sheets</span>
                </h4>
                <p className="text-slate-600 pl-8">
                  Mở bảng tính Google Sheets của bạn ➔ Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> ➔ Chọn <strong>Apps Script</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <span>Dán mã Apps Script</span>
                </h4>
                <p className="text-slate-600 pl-8">
                  Xóa toàn bộ mã cũ trong tệp <code>Mã.gs</code> (hoặc <code>Code.gs</code>) và dán đoạn mã chuẩn bên dưới:
                </p>
                <div className="pl-8">
                  <div className="bg-slate-900 rounded-xl p-3 text-slate-200 font-mono text-xs relative overflow-x-auto max-h-56 border border-slate-800">
                    <button
                      onClick={copyAppsScriptCode}
                      className="absolute top-2.5 right-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md z-10"
                    >
                      {hasCopiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-200" />
                          <span>Đã sao chép mã!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao chép mã Apps Script</span>
                        </>
                      )}
                    </button>
                    <pre className="pr-32 leading-relaxed whitespace-pre font-mono text-[11px]">
{APPS_SCRIPT_TEMPLATE}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <span>Triển khai bản Web App và lấy URL</span>
                </h4>
                <div className="pl-8 space-y-1.5 text-slate-600">
                  <p>1. Bấm nút <strong>Lưu (Save)</strong> hoặc nhấn tổ hợp phím <code>Ctrl + S</code>.</p>
                  <p>2. Bấm nút màu xanh <strong>Triển khai (Deploy)</strong> ở góc trên bên phải ➔ Chọn <strong>Bản triển khai mới (New deployment)</strong>.</p>
                  <p>3. Bấm vào biểu tượng bánh răng bên cạnh &ldquo;Chọn loại&rdquo; ➔ Chọn <strong>Ứng dụng web (Web app)</strong>.</p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium space-y-1 my-1">
                    <p>• <strong>Thực thi dưới dạng (Execute as):</strong> Chọn <code>Tôi (Me)</code></p>
                    <p>• <strong>Người có quyền truy cập (Who has access):</strong> Chọn <code>Bất kỳ ai (Anyone)</code></p>
                  </div>
                  <p>4. Bấm <strong>Triển khai</strong> ➔ Sao chép <strong>URL ứng dụng web</strong> (đường link kết thúc bằng <code>/exec</code>) và dán vào ô bên trên!</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  handleLoadDemoData();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Thử với dữ liệu mẫu trước</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
