import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetRecord, markRecordCompleted, markMultipleRecordsCompleted } from '../lib/sheets';
import {
  parseDate,
  calculateTimeRemaining,
  formatTimeRemaining,
  getWarningStatus,
  getCurrentDateStr,
} from '../lib/dateUtils';
import { cn } from '../lib/utils';
import {
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  LayoutGrid,
  AlignLeft,
  ChevronsUpDown,
  RotateCcw,
  CheckSquare,
  X,
  Loader2,
  ListChecks,
} from 'lucide-react';

interface RecordTableProps {
  records: SheetRecord[];
  webAppUrl: string;
  onRefresh: () => void;
}

export function RecordTable({
  records,
  webAppUrl,
  onRefresh,
}: RecordTableProps) {
  const [now, setNow] = useState(new Date());
  const [processingRows, setProcessingRows] = useState<Set<number>>(new Set());

  // Multi-select state
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoPhan, setSelectedBoPhan] = useState<string>('all');
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Display mode states: default to wrap text (full text display)
  const [isWrapText, setIsWrapText] = useState<boolean>(() => {
    const saved = localStorage.getItem('deadline_wrap_text');
    return saved !== null ? saved === 'true' : true;
  });

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    const saved = localStorage.getItem('deadline_compact_mode');
    return saved !== null ? saved === 'true' : false;
  });

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const toggleWrapText = () => {
    setIsWrapText((prev) => {
      const next = !prev;
      localStorage.setItem('deadline_wrap_text', String(next));
      return next;
    });
  };

  const toggleCompact = () => {
    setIsCompact((prev) => {
      const next = !prev;
      localStorage.setItem('deadline_compact_mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const processedRecords = useMemo(() => {
    return records
      .map((record) => {
        const ngayTraDate = parseDate(record.ngayTra);
        const traThucTeDate = parseDate(record.traThucTe);
        const isCompleted = !!record.traThucTe && record.traThucTe.trim().length > 0;

        const referenceDate = isCompleted ? traThucTeDate || now : now;
        const tr = calculateTimeRemaining(ngayTraDate, referenceDate);
        const warningStatus = getWarningStatus(tr);
        const isOverdue = tr?.isOverdue;

        return {
          ...record,
          ngayTraDate,
          traThucTeDate,
          isCompleted,
          tr,
          warningStatus,
          isOverdue,
        };
      })
      .sort((a, b) => {
        // Priority 1: Uncompleted before completed
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;

        // Priority 2: In uncompleted, overdue first
        if (!a.isCompleted && !b.isCompleted) {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;

          // Priority 3: Lowest remaining time first
          if (a.tr && b.tr) {
            return a.tr.totalSeconds - b.tr.totalSeconds;
          }
        }

        return a.rowIndex - b.rowIndex;
      });
  }, [records, now]);

  // Extract unique lists for filtering
  const uniqueBoPhanList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.boPhanHienTai && r.boPhanHienTai.trim()) {
        set.add(r.boPhanHienTai.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [records]);

  const uniqueMenuList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.menuHienTai && r.menuHienTai.trim()) {
        set.add(r.menuHienTai.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [records]);

  // Filtering records based on all conditions
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((rec) => {
      // 1. Search text filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (rec.soHoSo && rec.soHoSo.toLowerCase().includes(q)) ||
          (rec.quyTrinh && rec.quyTrinh.toLowerCase().includes(q)) ||
          (rec.tenDonVi && rec.tenDonVi.toLowerCase().includes(q)) ||
          (rec.boPhanHienTai && rec.boPhanHienTai.toLowerCase().includes(q)) ||
          (rec.menuHienTai && rec.menuHienTai.toLowerCase().includes(q)) ||
          (rec.coQuanXuLy && rec.coQuanXuLy.toLowerCase().includes(q)) ||
          (rec.canBoXuLy && rec.canBoXuLy.toLowerCase().includes(q));

        if (!match) return false;
      }

      // 2. Bộ phận hiện tại filter
      if (selectedBoPhan !== 'all') {
        if (!rec.boPhanHienTai || rec.boPhanHienTai.trim() !== selectedBoPhan) {
          return false;
        }
      }

      // 3. Menu hiện tại filter
      if (selectedMenu !== 'all') {
        if (!rec.menuHienTai || rec.menuHienTai.trim() !== selectedMenu) {
          return false;
        }
      }

      // 4. Status filter
      if (statusFilter === 'in_progress') {
        if (rec.isCompleted) return false;
      } else if (statusFilter === 'completed') {
        if (!rec.isCompleted) return false;
      } else if (statusFilter === 'overdue') {
        if (!rec.isOverdue) return false;
      } else if (statusFilter === 'warning') {
        if (rec.isCompleted || rec.isOverdue) return false;
        if (!['warning-1', 'warning-2', 'warning-3'].includes(rec.warningStatus)) return false;
      }

      return true;
    });
  }, [processedRecords, searchTerm, selectedBoPhan, selectedMenu, statusFilter]);

  // Uncompleted records in current filtered view (candidates for multi-select)
  const uncompletedInView = useMemo(() => {
    return filteredRecords.filter((r) => !r.isCompleted);
  }, [filteredRecords]);

  // Check if all uncompleted in view are selected
  const isAllInViewSelected = useMemo(() => {
    if (uncompletedInView.length === 0) return false;
    return uncompletedInView.every((r) => selectedRowIndices.has(r.rowIndex));
  }, [uncompletedInView, selectedRowIndices]);

  // Check if some uncompleted in view are selected
  const isSomeInViewSelected = useMemo(() => {
    if (isAllInViewSelected) return false;
    return uncompletedInView.some((r) => selectedRowIndices.has(r.rowIndex));
  }, [uncompletedInView, selectedRowIndices, isAllInViewSelected]);

  // Update indeterminate state of header checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeInViewSelected;
    }
  }, [isSomeInViewSelected]);

  const toggleSelectRow = (rowIndex: number) => {
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const toggleSelectAllInView = () => {
    if (isAllInViewSelected) {
      // Unselect all in current view
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        uncompletedInView.forEach((r) => next.delete(r.rowIndex));
        return next;
      });
    } else {
      // Select all in current view
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        uncompletedInView.forEach((r) => next.add(r.rowIndex));
        return next;
      });
    }
  };

  const handleSelectAllUncompleted = () => {
    const uncompletedAll = processedRecords.filter((r) => !r.isCompleted);
    setSelectedRowIndices(new Set(uncompletedAll.map((r) => r.rowIndex)));
  };

  const handleClearSelection = () => {
    setSelectedRowIndices(new Set());
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBoPhan('all');
    setSelectedMenu('all');
    setStatusFilter('all');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedBoPhan !== 'all' ||
    selectedMenu !== 'all' ||
    statusFilter !== 'all';

  // Single mark complete
  const handleMarkComplete = async (record: SheetRecord) => {
    if (!webAppUrl) {
      alert('Vui lòng nhập Web App URL trước');
      return;
    }

    const todayStr = getCurrentDateStr();
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đánh dấu hoàn thành hồ sơ ${record.soHoSo}? Thao tác này sẽ ghi nhận thời gian trả thực tế vào hệ thống.`
    );
    if (!confirmed) return;

    setProcessingRows((prev) => new Set(prev).add(record.rowIndex));
    try {
      const success = await markRecordCompleted(webAppUrl, record.rowIndex, todayStr);
      if (success) {
        setSelectedRowIndices((prev) => {
          const next = new Set(prev);
          next.delete(record.rowIndex);
          return next;
        });
        onRefresh();
      } else {
        alert('Có lỗi xảy ra khi cập nhật trạng thái hoàn thành.');
      }
    } catch (e: any) {
      alert('Lỗi: ' + (e?.message || 'Không thể cập nhật'));
    } finally {
      setProcessingRows((prev) => {
        const next = new Set(prev);
        next.delete(record.rowIndex);
        return next;
      });
    }
  };

  // Batch mark complete for all checked records
  const handleBatchMarkComplete = async () => {
    if (selectedRowIndices.size === 0) return;
    if (!webAppUrl) {
      alert('Vui lòng nhập Web App URL trước');
      return;
    }

    const count = selectedRowIndices.size;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đánh dấu hoàn thành cho ${count} hồ sơ đã chọn cùng một lúc? Thao tác này sẽ ghi nhận thời gian trả thực tế vào hệ thống.`
    );
    if (!confirmed) return;

    const rowIndicesToProcess: number[] = Array.from(selectedRowIndices);
    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: count });

    // Mark all rows as processing for visual spinner
    setProcessingRows((prev) => {
      const next = new Set(prev);
      rowIndicesToProcess.forEach((idx) => next.add(idx));
      return next;
    });

    const todayStr = getCurrentDateStr();

    try {
      const res = await markMultipleRecordsCompleted(
        webAppUrl,
        rowIndicesToProcess,
        todayStr,
        (current, total) => {
          setBatchProgress({ current, total });
        }
      );

      if (res.success) {
        setSelectedRowIndices(new Set());
        onRefresh();
        alert(`Đã cập nhật thành công ${res.successCount} hồ sơ!`);
      } else {
        alert('Có lỗi xảy ra trong quá trình cập nhật hồ sơ hàng loạt.');
      }
    } catch (e: any) {
      alert('Lỗi: ' + (e?.message || 'Không thể hoàn thành hàng loạt'));
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(null);
      setProcessingRows((prev) => {
        const next = new Set(prev);
        rowIndicesToProcess.forEach((idx) => next.delete(idx));
        return next;
      });
    }
  };

  const overdueCount = processedRecords.filter((r) => r.isOverdue && !r.isCompleted).length;
  const warningCount = processedRecords.filter(
    (r) => !r.isCompleted && !r.isOverdue && ['warning-1', 'warning-2', 'warning-3'].includes(r.warningStatus)
  ).length;
  const completedCount = processedRecords.filter((r) => r.isCompleted).length;
  const totalUncompletedCount = processedRecords.length - completedCount;

  // Cell padding class based on compact mode
  const cellPadding = isCompact ? 'px-2.5 py-1.5' : 'px-3 py-2.5';

  return (
    <div className="flex flex-col gap-3">
      {/* Alert banner if overdue exists */}
      {(overdueCount > 0 || warningCount > 0) && (
        <div className="mx-4 mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1 text-xs sm:text-sm">
            <span className="font-semibold">Lưu ý theo dõi hạn: </span>
            {overdueCount > 0 && (
              <span className="inline-block mr-3">
                Có <strong className="font-bold text-red-600">{overdueCount}</strong> hồ sơ đang <strong className="font-bold text-red-600">quá hạn</strong>.
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-block">
                Có <strong className="font-bold">{warningCount}</strong> hồ sơ <strong className="font-bold">sắp đến hạn</strong> trong 3 ngày tới.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating / Sticky Batch Action Bar when records are selected */}
      {selectedRowIndices.size > 0 && (
        <div className="mx-4 p-3 bg-emerald-800 text-white rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 sticky top-16 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center font-bold text-sm">
              {selectedRowIndices.size}
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">
                Đã chọn {selectedRowIndices.size} hồ sơ cần hoàn thành
              </div>
              <div className="text-xs text-emerald-200">
                Nhấn nút bên cạnh để ghi nhận hoàn thành cùng lúc cho tất cả các hồ sơ đã tích
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchMarkComplete}
              disabled={isBatchProcessing}
              className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-900 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isBatchProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>
                    {batchProgress
                      ? `Đang cập nhật ${batchProgress.current}/${batchProgress.total}...`
                      : 'Đang xử lý...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Hoàn thành {selectedRowIndices.size} hồ sơ cùng lúc</span>
                </>
              )}
            </button>

            <button
              onClick={handleClearSelection}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 bg-emerald-900/80 hover:bg-emerald-950 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Bỏ chọn tất cả"
            >
              <X className="w-3.5 h-3.5" />
              <span>Bỏ chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter, Search & View Controls Bar */}
      <div className="px-4 pt-1 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số hồ sơ, quy trình, bộ phận, cán bộ, tên đơn vị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-2xs"
          />
        </div>

        {/* Dropdowns & Display Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {/* Quick Select All Uncompleted Button */}
          {totalUncompletedCount > 0 && (
            <button
              onClick={handleSelectAllUncompleted}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Tích chọn toàn bộ các hồ sơ chưa hoàn thành"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>Chọn tất cả chưa xong ({totalUncompletedCount})</span>
            </button>
          )}

          {/* Bộ phận hiện tại filter */}
          {uniqueBoPhanList.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedBoPhan}
                onChange={(e) => setSelectedBoPhan(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs cursor-pointer max-w-[150px] truncate"
                title="Lọc theo Bộ phận hiện tại"
              >
                <option value="all">Tất cả Bộ phận ({uniqueBoPhanList.length})</option>
                {uniqueBoPhanList.map((bp) => (
                  <option key={bp} value={bp}>
                    {bp}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Menu hiện tại filter */}
          {uniqueMenuList.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMenu}
                onChange={(e) => setSelectedMenu(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs cursor-pointer max-w-[150px] truncate"
                title="Lọc theo Menu hiện tại"
              >
                <option value="all">Tất cả Menu ({uniqueMenuList.length})</option>
                {uniqueMenuList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_progress">Đang xử lý (chưa xong)</option>
              <option value="overdue">Quá hạn ({overdueCount})</option>
              <option value="warning">Sắp đến hạn ({warningCount})</option>
              <option value="completed">Đã hoàn thành ({completedCount})</option>
            </select>
          </div>

          {/* Reset filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium cursor-pointer shadow-2xs transition-colors"
              title="Xóa tất cả bộ lọc đang áp dụng"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Xóa lọc</span>
            </button>
          )}

          {/* Wrap Text Toggle */}
          <button
            onClick={toggleWrapText}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-2xs transition-colors cursor-pointer',
              isWrapText
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
            title={
              isWrapText
                ? 'Đang bật hiển thị đầy đủ chữ (xuống dòng tự nhiên). Bấm để chuyển sang thu gọn 1 dòng (...)'
                : 'Đang bật thu gọn 1 dòng. Bấm để hiển thị trọn vẹn toàn bộ chữ không bị cắt bớt'
            }
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Chữ: <strong>{isWrapText ? 'Hiện đủ chữ' : 'Thu gọn'}</strong>
            </span>
          </button>

          {/* Density Compact Toggle */}
          <button
            onClick={toggleCompact}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-2xs transition-colors cursor-pointer',
              isCompact
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            )}
            title="Đổi khoảng cách dòng: Gọn gàng hoặc Vừa vặn"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Dòng: <strong>{isCompact ? 'Gọn' : 'Vừa'}</strong>
            </span>
          </button>
        </div>
      </div>

      {/* Main Table Container: Full Landscape with comfortable horizontal scroll when needed */}
      <div className="overflow-x-auto bg-white border-t border-slate-200">
        <table className="w-full min-w-full text-xs xl:text-sm text-left border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              {/* Checkbox All column */}
              <th className="px-3 py-3 w-10 text-center whitespace-nowrap">
                <input
                  type="checkbox"
                  ref={headerCheckboxRef}
                  checked={isAllInViewSelected}
                  onChange={toggleSelectAllInView}
                  disabled={uncompletedInView.length === 0}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                  title={
                    uncompletedInView.length === 0
                      ? 'Không có hồ sơ nào chưa hoàn thành để chọn'
                      : isAllInViewSelected
                      ? 'Bỏ chọn tất cả hồ sơ trong bảng'
                      : 'Chọn tất cả hồ sơ chưa hoàn thành trong bảng'
                  }
                />
              </th>
              <th className="px-2.5 py-3 w-10 text-center whitespace-nowrap">STT</th>
              <th className="px-3.5 py-3 whitespace-nowrap min-w-[140px]">Số Hồ Sơ</th>
              <th className="px-3.5 py-3 min-w-[200px] xl:min-w-[240px]">Quy Trình</th>
              <th className="px-3.5 py-3 min-w-[160px] xl:min-w-[200px] text-emerald-900 bg-emerald-50/40">
                Bộ Phận Hiện Tại
              </th>
              <th className="px-3.5 py-3 min-w-[160px] xl:min-w-[200px] text-blue-900 bg-blue-50/40">
                Menu Hiện Tại
              </th>
              <th className="px-3.5 py-3 min-w-[180px] xl:min-w-[240px]">Tên Đơn Vị / Họ Tên</th>
              <th className="px-3.5 py-3 min-w-[180px] xl:min-w-[220px]">Cơ Quan / Cán Bộ XL</th>
              <th className="px-3 py-3 whitespace-nowrap text-center min-w-[105px]">Ngày Nhận</th>
              <th className="px-3 py-3 whitespace-nowrap text-center min-w-[105px]">Hạn Trả</th>
              <th className="px-3 py-3 whitespace-nowrap text-center min-w-[105px]">Trả Thực Tế</th>
              <th className="px-3.5 py-3 whitespace-nowrap min-w-[165px]">Thời Gian Còn Lại</th>
              <th className="px-3 py-3 text-center whitespace-nowrap w-20">Hoàn Thành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-slate-700">
                      {records.length === 0
                        ? 'Chưa có dữ liệu hồ sơ'
                        : 'Không tìm thấy hồ sơ nào khớp với bộ lọc'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                      >
                        Bấm vào đây để xóa bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, idx) => {
                const isSelected = selectedRowIndices.has(record.rowIndex);
                const isProcessing = processingRows.has(record.rowIndex);

                const statusColorClass = !record.isCompleted
                  ? {
                      overdue: 'bg-red-50 text-red-700 border-red-200',
                      'warning-1': 'bg-orange-50 text-orange-700 border-orange-200',
                      'warning-2': 'bg-amber-50 text-amber-700 border-amber-200',
                      'warning-3': 'bg-yellow-50 text-yellow-700 border-yellow-200',
                      safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      none: 'bg-slate-50 text-slate-600 border-slate-200',
                    }[record.warningStatus]
                  : record.isOverdue
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <tr
                    key={record.rowIndex}
                    className={cn(
                      'transition-colors',
                      isSelected
                        ? 'bg-emerald-50/80 font-medium'
                        : 'odd:bg-white even:bg-slate-50/40 hover:bg-emerald-50/30'
                    )}
                  >
                    {/* Checkbox column */}
                    <td className={cn(cellPadding, 'text-center')}>
                      {record.isCompleted ? (
                        <span
                          className="inline-flex items-center justify-center text-emerald-600/70"
                          title="Hồ sơ đã được đánh dấu hoàn thành"
                        >
                          <Check className="w-4 h-4 text-emerald-600" />
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(record.rowIndex)}
                          disabled={isProcessing}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                          title={`Tích chọn hồ sơ ${record.soHoSo} để hoàn thành cùng 1 lần`}
                        />
                      )}
                    </td>

                    {/* STT */}
                    <td className={cn(cellPadding, 'text-center text-slate-500 font-mono')}>
                      {record.stt || idx + 1}
                    </td>

                    {/* SỐ HỒ SƠ */}
                    <td className={cn(cellPadding, 'font-semibold font-mono text-slate-900 whitespace-nowrap')}>
                      {record.soHoSo || '-'}
                    </td>

                    {/* QUY TRÌNH */}
                    <td
                      className={cn(
                        cellPadding,
                        'text-slate-800',
                        isWrapText
                          ? 'whitespace-normal break-words leading-relaxed max-w-[340px]'
                          : 'max-w-[240px] truncate'
                      )}
                      title={record.quyTrinh}
                    >
                      {record.quyTrinh || '-'}
                    </td>

                    {/* BỘ PHẬN HIỆN TẠI */}
                    <td
                      className={cn(
                        cellPadding,
                        'text-slate-800 font-medium',
                        isWrapText
                          ? 'whitespace-normal break-words leading-relaxed max-w-[260px]'
                          : 'max-w-[200px] truncate'
                      )}
                      title={record.boPhanHienTai}
                    >
                      {record.boPhanHienTai || '-'}
                    </td>

                    {/* MENU HIỆN TẠI */}
                    <td
                      className={cn(
                        cellPadding,
                        'text-slate-700',
                        isWrapText
                          ? 'whitespace-normal break-words leading-relaxed max-w-[260px]'
                          : 'max-w-[200px] truncate'
                      )}
                      title={record.menuHienTai}
                    >
                      {record.menuHienTai || '-'}
                    </td>

                    {/* TÊN ĐƠN VỊ / HỌ TÊN */}
                    <td
                      className={cn(
                        cellPadding,
                        'text-slate-900 font-medium',
                        isWrapText
                          ? 'whitespace-normal break-words leading-relaxed max-w-[320px]'
                          : 'max-w-[220px] truncate'
                      )}
                      title={record.tenDonVi}
                    >
                      {record.tenDonVi || '-'}
                    </td>

                    {/* CƠ QUAN / CÁN BỘ XL */}
                    <td className={cn(cellPadding, 'text-slate-600')}>
                      <div
                        className={cn(
                          'font-medium text-slate-800',
                          isWrapText ? 'whitespace-normal break-words leading-tight' : 'max-w-[200px] truncate'
                        )}
                        title={record.coQuanXuLy}
                      >
                        {record.coQuanXuLy || '-'}
                      </div>
                      <div
                        className={cn(
                          'text-slate-500 mt-0.5',
                          isWrapText ? 'whitespace-normal break-words leading-tight' : 'max-w-[200px] truncate'
                        )}
                        title={record.canBoXuLy}
                      >
                        {record.canBoXuLy || '-'}
                      </div>
                    </td>

                    {/* NGÀY NHẬN */}
                    <td className={cn(cellPadding, 'text-slate-600 whitespace-nowrap text-center font-mono')}>
                      {record.ngayNhan || '-'}
                    </td>

                    {/* HẠN TRẢ */}
                    <td className={cn(cellPadding, 'text-slate-900 font-semibold whitespace-nowrap text-center font-mono')}>
                      {record.ngayTra || '-'}
                    </td>

                    {/* TRẢ THỰC TẾ */}
                    <td className={cn(cellPadding, 'whitespace-nowrap text-center font-mono')}>
                      {record.traThucTe ? (
                        <span className="text-emerald-700 font-medium">{record.traThucTe}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa trả</span>
                      )}
                    </td>

                    {/* THỜI GIAN CÒN LẠI */}
                    <td className={cn(cellPadding, 'whitespace-nowrap')}>
                      <div
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border shadow-2xs',
                          statusColorClass
                        )}
                      >
                        {record.isCompleted ? (
                          <>
                            {record.isOverdue ? (
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {record.isOverdue
                                ? `Trễ hạn (${formatTimeRemaining(record.tr!)})`
                                : 'Đúng hạn'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {record.tr ? formatTimeRemaining(record.tr) : 'Không xác định'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* HOÀN THÀNH ĐƠN LẺ */}
                    <td className={cn(cellPadding, 'text-center')}>
                      {record.isCompleted ? (
                        <span
                          className="inline-flex items-center justify-center text-emerald-600 bg-emerald-100 p-1.5 rounded-full"
                          title="Đã hoàn thành"
                        >
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkComplete(record)}
                          disabled={isProcessing || isBatchProcessing}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                          title="Đánh dấu hoàn thành riêng hồ sơ này"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
