import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SheetRecord,
  markRecordCompleted,
  markMultipleRecordsCompleted,
  saveCompletedOverride,
  removeCompletedOverride,
  saveCompletedOverridesBatch,
  getCompletedOverrides,
  getRecordKey,
} from '../lib/sheets';
import {
  parseDate,
  calculateTimeRemaining,
  formatTimeRemaining,
  getWarningStatus,
  getCurrentDateStr,
} from '../lib/dateUtils';
import { cn } from '../lib/utils';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  LayoutGrid,
  Check,
  AlignLeft,
  ChevronsUpDown,
  RotateCcw,
  CheckSquare,
  X,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Undo2,
} from 'lucide-react';

export type SortOption =
  | 'upcoming_closest'  // Sắp đến hạn gần nhất (còn ít thời gian nhất lên đầu - MẶC ĐỊNH)
  | 'closest_to_now'    // Hạn chót sát giờ hiện tại nhất (|hạn - hiện tại| nhỏ nhất)
  | 'overdue_first'     // Quá hạn & Khẩn cấp lên đầu
  | 'ngay_tra_asc'      // Hạn trả: Sớm nhất ➔ Muộn nhất
  | 'ngay_tra_desc'     // Hạn trả: Muộn nhất ➔ Sớm nhất
  | 'ngay_nhan_desc'    // Ngày nhận: Mới nhất lên đầu
  | 'stt_asc';          // Thứ tự ban đầu (STT)

interface RecordTableProps {
  records: SheetRecord[];
  webAppUrl: string;
  onRefresh: () => void;
  onUpdateRecord?: (rowIndex: number, timestampStr: string, soHoSo?: string) => void;
  onUndoRecord?: (rowIndex: number, soHoSo?: string) => void;
  onUpdateMultipleRecords?: (rowIndices: number[], timestampStr: string) => void;
}

export function RecordTable({
  records,
  webAppUrl,
  onRefresh,
  onUpdateRecord,
  onUndoRecord,
  onUpdateMultipleRecords,
}: RecordTableProps) {
  const [now, setNow] = useState(new Date());
  const [processingRows, setProcessingRows] = useState<Set<number>>(new Set());

  // Local completed overrides state to guarantee instant UI update without waiting for network
  const [localCompletedMap, setLocalCompletedMap] = useState<Record<string, string>>(() =>
    getCompletedOverrides()
  );

  // Sync with records or local storage
  useEffect(() => {
    setLocalCompletedMap(getCompletedOverrides());
  }, [records]);

  // Multi-select state
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Toast notification for user action feedback
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    record?: SheetRecord;
  } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoPhan, setSelectedBoPhan] = useState<string>('all');
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting state - default is 'upcoming_closest' (sắp đến hạn mới nhất, gần nhất đẩy lên đầu)
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const saved = localStorage.getItem('deadline_sort_option');
    if (
      saved &&
      ['upcoming_closest', 'closest_to_now', 'overdue_first', 'ngay_tra_asc', 'ngay_tra_desc', 'ngay_nhan_desc', 'stt_asc'].includes(saved)
    ) {
      return saved as SortOption;
    }
    return 'upcoming_closest';
  });

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    localStorage.setItem('deadline_sort_option', newSort);
  };

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
        const ngayNhanDate = parseDate(record.ngayNhan);

        // Check local override or recorded traThucTe by unique record key (never pure rowIndex)
        const recKey = getRecordKey(record);
        const overrideTimestamp =
          (record.soHoSo ? localCompletedMap[`shs_${record.soHoSo.trim()}`] : undefined) ||
          localCompletedMap[recKey];
        const traThucTe = (record.traThucTe && record.traThucTe.trim().length > 0)
          ? record.traThucTe
          : (overrideTimestamp || '');
        const traThucTeDate = parseDate(traThucTe);
        const isCompleted = !!traThucTe && traThucTe.trim().length > 0;

        const referenceDate = isCompleted ? traThucTeDate || now : now;
        const tr = calculateTimeRemaining(ngayTraDate, referenceDate);
        const warningStatus = getWarningStatus(tr);
        const isOverdue = tr?.isOverdue;

        return {
          ...record,
          traThucTe,
          ngayTraDate,
          ngayNhanDate,
          traThucTeDate,
          isCompleted,
          tr,
          warningStatus,
          isOverdue,
        };
      })
      .sort((a, b) => {
        // Priority 1: Uncompleted records ALWAYS come before Completed records.
        // Completed records ALWAYS go down below ("Đã hoàn thành xuống phía dưới")
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;

        // When comparing two uncompleted records:
        if (!a.isCompleted && !b.isCompleted) {
          switch (sortOption) {
            case 'upcoming_closest': {
              // 1. Hồ sơ SẮP ĐẾN HẠN (chưa quá hạn, tr.totalSeconds >= 0): ĐẨY LÊN ĐẦU TIÊN
              // Sắp xếp tăng dần theo thời gian còn lại (còn ít thời gian nhất lên trước)
              if (!a.isOverdue && !b.isOverdue) {
                const aSec = a.tr ? a.tr.totalSeconds : Number.MAX_SAFE_INTEGER;
                const bSec = b.tr ? b.tr.totalSeconds : Number.MAX_SAFE_INTEGER;
                if (aSec !== bSec) return aSec - bSec;
              }

              // Sắp đến hạn ưu tiên trước quá hạn
              if (!a.isOverdue && b.isOverdue) return -1;
              if (a.isOverdue && !b.isOverdue) return 1;

              // Cả hai đều quá hạn: Hồ sơ vừa mới quá hạn gần đây nhất lên trước
              if (a.isOverdue && b.isOverdue) {
                const aSec = a.tr ? a.tr.totalSeconds : -Number.MAX_SAFE_INTEGER;
                const bSec = b.tr ? b.tr.totalSeconds : -Number.MAX_SAFE_INTEGER;
                if (aSec !== bSec) return bSec - aSec;
              }
              break;
            }

            case 'closest_to_now': {
              const aDiff = a.tr ? Math.abs(a.tr.totalSeconds) : Number.MAX_SAFE_INTEGER;
              const bDiff = b.tr ? Math.abs(b.tr.totalSeconds) : Number.MAX_SAFE_INTEGER;
              if (aDiff !== bDiff) return aDiff - bDiff;
              break;
            }

            case 'overdue_first': {
              if (a.isOverdue && !b.isOverdue) return -1;
              if (!a.isOverdue && b.isOverdue) return 1;

              if (a.isOverdue && b.isOverdue) {
                const aSec = a.tr ? a.tr.totalSeconds : -Number.MAX_SAFE_INTEGER;
                const bSec = b.tr ? b.tr.totalSeconds : -Number.MAX_SAFE_INTEGER;
                if (aSec !== bSec) return bSec - aSec;
              }

              if (!a.isOverdue && !b.isOverdue) {
                const aSec = a.tr ? a.tr.totalSeconds : Number.MAX_SAFE_INTEGER;
                const bSec = b.tr ? b.tr.totalSeconds : Number.MAX_SAFE_INTEGER;
                if (aSec !== bSec) return aSec - bSec;
              }
              break;
            }

            case 'ngay_tra_asc': {
              const aTime = a.ngayTraDate ? a.ngayTraDate.getTime() : Number.MAX_SAFE_INTEGER;
              const bTime = b.ngayTraDate ? b.ngayTraDate.getTime() : Number.MAX_SAFE_INTEGER;
              if (aTime !== bTime) return aTime - bTime;
              break;
            }

            case 'ngay_tra_desc': {
              const aTime = a.ngayTraDate ? a.ngayTraDate.getTime() : -Number.MAX_SAFE_INTEGER;
              const bTime = b.ngayTraDate ? b.ngayTraDate.getTime() : -Number.MAX_SAFE_INTEGER;
              if (aTime !== bTime) return bTime - aTime;
              break;
            }

            case 'ngay_nhan_desc': {
              const aTime = a.ngayNhanDate ? a.ngayNhanDate.getTime() : -Number.MAX_SAFE_INTEGER;
              const bTime = b.ngayNhanDate ? b.ngayNhanDate.getTime() : -Number.MAX_SAFE_INTEGER;
              if (aTime !== bTime) return bTime - aTime;
              break;
            }

            case 'stt_asc':
            default:
              return Number(a.rowIndex) - Number(b.rowIndex);
          }
        }

        // When comparing two completed records:
        if (a.isCompleted && b.isCompleted) {
          if (a.traThucTeDate && b.traThucTeDate) {
            return b.traThucTeDate.getTime() - a.traThucTeDate.getTime();
          }
        }

        return Number(a.rowIndex) - Number(b.rowIndex);
      });
  }, [records, now, sortOption, localCompletedMap]);

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

  // Split into uncompleted and completed lists
  const uncompletedList = useMemo(() => {
    return filteredRecords.filter((r) => !r.isCompleted);
  }, [filteredRecords]);

  const completedList = useMemo(() => {
    return filteredRecords.filter((r) => r.isCompleted);
  }, [filteredRecords]);

  // Check if all uncompleted in view are selected
  const isAllInViewSelected = useMemo(() => {
    if (uncompletedList.length === 0) return false;
    return uncompletedList.every((r) => selectedRowIndices.has(r.rowIndex));
  }, [uncompletedList, selectedRowIndices]);

  // Check if some uncompleted in view are selected
  const isSomeInViewSelected = useMemo(() => {
    if (isAllInViewSelected) return false;
    return uncompletedList.some((r) => selectedRowIndices.has(r.rowIndex));
  }, [uncompletedList, selectedRowIndices, isAllInViewSelected]);

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
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        uncompletedList.forEach((r) => next.delete(r.rowIndex));
        return next;
      });
    } else {
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        uncompletedList.forEach((r) => next.add(r.rowIndex));
        return next;
      });
    }
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

  // 1. Single mark complete: INSTANT optimistic update, NO blocking window.confirm, moves down immediately
  const handleMarkComplete = (record: SheetRecord) => {
    const todayStr = getCurrentDateStr();
    const recKey = getRecordKey(record);

    // 1. Optimistic instant local update
    setLocalCompletedMap((prev) => ({
      ...prev,
      [recKey]: todayStr,
      ...(record.soHoSo ? { [`shs_${record.soHoSo.trim()}`]: todayStr } : {}),
    }));
    saveCompletedOverride(record, todayStr);

    if (onUpdateRecord) {
      onUpdateRecord(record.rowIndex, todayStr, record.soHoSo);
    }

    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      next.delete(record.rowIndex);
      return next;
    });

    setToastMessage({
      text: `✓ Đã hoàn thành hồ sơ ${record.soHoSo || record.stt} và chuyển ngay xuống danh sách Đã hoàn thành phía dưới!`,
      record: { ...record, traThucTe: todayStr },
    });

    // 2. Background sync to Google Sheets
    if (webAppUrl) {
      setProcessingRows((prev) => new Set(prev).add(record.rowIndex));
      markRecordCompleted(webAppUrl, record.rowIndex, todayStr)
        .catch((e) => console.warn('Background sync warning:', e))
        .finally(() => {
          setProcessingRows((prev) => {
            const next = new Set(prev);
            next.delete(record.rowIndex);
            return next;
          });
        });
    }
  };

  // 2. Undo complete: Returns record back to uncompleted section immediately
  const handleUndoComplete = (record: SheetRecord) => {
    const recKey = getRecordKey(record);
    setLocalCompletedMap((prev) => {
      const next = { ...prev };
      delete next[recKey];
      delete next[String(record.rowIndex)];
      if (record.soHoSo) delete next[`shs_${record.soHoSo.trim()}`];
      return next;
    });
    removeCompletedOverride(record);

    if (onUndoRecord) {
      onUndoRecord(record.rowIndex, record.soHoSo);
    }

    setToastMessage({
      text: `Đã hoàn tác hồ sơ ${record.soHoSo || record.stt} về danh sách Đang xử lý.`,
    });
  };

  // 3. Batch mark complete: triggered by "Xử lý xong" button
  const handleTichChonBatch = () => {
    // ONLY process the records that have been ticked/selected via checkboxes!
    const targetRecords = filteredRecords.filter(
      (r) => !r.isCompleted && selectedRowIndices.has(r.rowIndex)
    );

    if (targetRecords.length === 0) {
      setToastMessage({
        text: 'Vui lòng tích chọn ít nhất 1 hồ sơ ở cột "TÍCH CHỌN" trước khi bấm Xử lý xong!',
      });
      return;
    }

    const count = targetRecords.length;
    const todayStr = getCurrentDateStr();
    const rowIndicesToProcess = targetRecords.map((r) => r.rowIndex);

    // 1. Optimistic instant local update: ALL target records move down immediately
    setLocalCompletedMap((prev) => {
      const next = { ...prev };
      targetRecords.forEach((r) => {
        const k = getRecordKey(r);
        next[k] = todayStr;
        if (r.soHoSo) next[`shs_${r.soHoSo.trim()}`] = todayStr;
      });
      return next;
    });

    saveCompletedOverridesBatch(
      targetRecords.map((r) => ({
        rowIndex: r.rowIndex,
        soHoSo: r.soHoSo,
        tenDonVi: r.tenDonVi,
        quyTrinh: r.quyTrinh,
        ngayNhan: r.ngayNhan,
      })),
      todayStr
    );

    if (onUpdateMultipleRecords) {
      onUpdateMultipleRecords(rowIndicesToProcess, todayStr);
    }

    setSelectedRowIndices(new Set());

    setToastMessage({
      text: `✓ Đã xử lý xong ${count} hồ sơ đã chọn và chuyển ngay xuống danh sách Đã hoàn thành phía dưới!`,
    });

    // 2. Background sync to Google Sheets
    if (webAppUrl) {
      setIsBatchProcessing(true);
      setBatchProgress({ current: 0, total: count });
      setProcessingRows((prev) => {
        const next = new Set(prev);
        rowIndicesToProcess.forEach((idx) => next.add(idx));
        return next;
      });

      markMultipleRecordsCompleted(
        webAppUrl,
        rowIndicesToProcess,
        todayStr,
        (current, total) => setBatchProgress({ current, total })
      )
        .catch((e) => console.warn('Batch sync warning:', e))
        .finally(() => {
          setIsBatchProcessing(false);
          setBatchProgress(null);
          setProcessingRows((prev) => {
            const next = new Set(prev);
            rowIndicesToProcess.forEach((idx) => next.delete(idx));
            return next;
          });
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
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="mx-4 p-3 bg-emerald-900 text-white rounded-xl shadow-lg border border-emerald-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 sticky top-16 z-30">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {toastMessage.record && (
              <button
                onClick={() => {
                  handleUndoComplete(toastMessage.record!);
                  setToastMessage(null);
                }}
                className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-600 transition-colors cursor-pointer"
                title="Bấm để hoàn tác lại hồ sơ này"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Hoàn tác</span>
              </button>
            )}
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-emerald-800 rounded-md text-emerald-200 transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
      {/* Floating / Sticky Batch Action Bar when records are selected */}
      {selectedRowIndices.size > 0 && (
        <div className="mx-4 p-3 bg-emerald-800 text-white rounded-xl shadow-lg border border-emerald-600 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 sticky top-16 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/90 border border-emerald-500/50 flex items-center justify-center font-bold text-sm shadow-xs">
              {selectedRowIndices.size}
            </div>
            <div>
              <div className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>Đã tích chọn <strong>{selectedRowIndices.size}</strong> hồ sơ</span>
                <span className="text-[11px] bg-emerald-600/80 px-2 py-0.5 rounded-full font-medium">Sẵn sàng xử lý</span>
              </div>
              <div className="text-xs text-emerald-200">
                Bấm nút &ldquo;Xử lý xong&rdquo; bên cạnh để hoàn thành và chuyển ngay toàn bộ {selectedRowIndices.size} hồ sơ này xuống danh sách phía dưới
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTichChonBatch}
              disabled={isBatchProcessing}
              className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-950 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
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
                  <span>Xử lý xong ({selectedRowIndices.size} hồ sơ đã chọn)</span>
                </>
              )}
            </button>

            <button
              onClick={handleClearSelection}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 bg-emerald-900/80 hover:bg-emerald-950 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-emerald-700"
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
          {/* Quick Action Button for selected records */}
          {selectedRowIndices.size > 0 ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTichChonBatch}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title={`Bấm để xử lý xong ${selectedRowIndices.size} hồ sơ đã tích chọn`}
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Xử lý xong ({selectedRowIndices.size})</span>
              </button>
              <button
                onClick={handleClearSelection}
                disabled={isBatchProcessing}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                title="Bỏ chọn tất cả"
              >
                Bỏ chọn
              </button>
            </div>
          ) : (
            uncompletedList.length > 0 && (
              <button
                onClick={toggleSelectAllInView}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Bấm để tích chọn tất cả hồ sơ đang hiển thị để xử lý hàng loạt"
              >
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Tích chọn tất cả ({uncompletedList.length})</span>
              </button>
            )
          )}

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-900 hidden sm:inline shrink-0">Sắp xếp:</span>
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="bg-transparent border-none text-emerald-950 font-bold focus:outline-none text-xs cursor-pointer max-w-[210px] truncate"
              title="Tiêu chí sắp xếp: Sắp đến hạn mới nhất, gần nhất đẩy lên đầu"
            >
              <option value="upcoming_closest">⚡ Sắp đến hạn gần nhất (Lên đầu)</option>
              <option value="closest_to_now">⏱️ Hạn chót sát giờ hiện tại nhất</option>
              <option value="overdue_first">🚨 Quá hạn & Khẩn cấp lên đầu</option>
              <option value="ngay_tra_asc">📅 Hạn trả: Sớm nhất ➔ Muộn nhất</option>
              <option value="ngay_tra_desc">📅 Hạn trả: Muộn nhất ➔ Sớm nhất</option>
              <option value="ngay_nhan_desc">📥 Ngày nhận: Mới nhất lên đầu</option>
              <option value="stt_asc">🔢 Thứ tự ban đầu (STT)</option>
            </select>
          </div>

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
                ? 'Đang bật hiển thị đầy đủ chữ. Bấm để chuyển sang thu gọn 1 dòng'
                : 'Đang bật thu gọn 1 dòng. Bấm để hiển thị trọn vẹn toàn bộ chữ'
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

      {/* Main Table Container */}
      <div className="overflow-x-auto bg-white border-t border-slate-200">
        <table className="w-full min-w-full text-xs xl:text-sm text-left border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              {/* Checkbox Column */}
              <th className="px-2 py-3 w-16 text-center whitespace-nowrap bg-emerald-100/90 text-emerald-950 font-bold border-r border-emerald-200">
                <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none" title="Tích chọn">
                  <input
                    type="checkbox"
                    ref={headerCheckboxRef}
                    checked={isAllInViewSelected}
                    onChange={toggleSelectAllInView}
                    disabled={uncompletedList.length === 0}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 accent-emerald-600"
                  />
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">TÍCH CHỌN</span>
                </label>
              </th>
              <th
                onClick={() => handleSortChange(sortOption === 'stt_asc' ? 'upcoming_closest' : 'stt_asc')}
                className="px-2.5 py-3 w-10 text-center whitespace-nowrap cursor-pointer hover:bg-slate-200/80 select-none group transition-colors"
                title="Bấm để sắp xếp theo số thứ tự (STT)"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>STT</span>
                  {sortOption === 'stt_asc' ? (
                    <ArrowUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </th>
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
              <th
                onClick={() => handleSortChange(sortOption === 'ngay_nhan_desc' ? 'stt_asc' : 'ngay_nhan_desc')}
                className="px-3 py-3 whitespace-nowrap text-center min-w-[105px] cursor-pointer hover:bg-slate-200/80 select-none group transition-colors"
                title="Bấm để sắp xếp theo ngày tiếp nhận mới nhất"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Ngày Nhận</span>
                  {sortOption === 'ngay_nhan_desc' ? (
                    <ArrowDown className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </th>
              <th
                onClick={() =>
                  handleSortChange(sortOption === 'ngay_tra_asc' ? 'ngay_tra_desc' : 'ngay_tra_asc')
                }
                className={cn(
                  'px-3 py-3 whitespace-nowrap text-center min-w-[105px] cursor-pointer select-none group transition-colors',
                  sortOption.startsWith('ngay_tra') ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-200/80'
                )}
                title="Bấm để sắp xếp theo Hạn trả (Sớm nhất ➔ Muộn nhất / Ngược lại)"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Hạn Trả</span>
                  {sortOption === 'ngay_tra_asc' ? (
                    <ArrowUp className="w-3 h-3 text-emerald-600" />
                  ) : sortOption === 'ngay_tra_desc' ? (
                    <ArrowDown className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </th>
              <th className="px-3 py-3 whitespace-nowrap text-center min-w-[105px]">Trả Thực Tế</th>
              <th
                onClick={() =>
                  handleSortChange(
                    sortOption === 'upcoming_closest' ? 'overdue_first' : 'upcoming_closest'
                  )
                }
                className={cn(
                  'px-3.5 py-3 whitespace-nowrap min-w-[185px] cursor-pointer select-none transition-colors group',
                  sortOption === 'upcoming_closest'
                    ? 'bg-emerald-100 text-emerald-950 font-bold border-b-2 border-emerald-600'
                    : sortOption === 'overdue_first'
                    ? 'bg-red-50 text-red-950 font-bold border-b-2 border-red-600'
                    : 'hover:bg-slate-200/80'
                )}
                title="Bấm để đổi chế độ: Sắp đến hạn gần nhất ➔ Quá hạn lên đầu"
              >
                <div className="flex items-center gap-1.5">
                  <span>Thời Gian Còn Lại</span>
                  {sortOption === 'upcoming_closest' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold shadow-2xs">
                      <ArrowUp className="w-2.5 h-2.5" /> Gần nhất
                    </span>
                  ) : sortOption === 'overdue_first' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold shadow-2xs">
                      <ArrowDown className="w-2.5 h-2.5" /> Quá hạn
                    </span>
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-center whitespace-nowrap w-24">Hoàn Thành</th>
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
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline cursor-pointer"
                      >
                        Bấm vào đây để xóa bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* SECTION 1: HỒ SƠ ĐANG XỬ LÝ (CHƯA HOÀN THÀNH) */}
                {uncompletedList.map((record, idx) => {
                  const isSelected = selectedRowIndices.has(record.rowIndex);
                  const isProcessing = processingRows.has(record.rowIndex);

                  const statusColorClass = {
                    overdue: 'bg-red-50 text-red-700 border-red-200',
                    'warning-1': 'bg-orange-50 text-orange-700 border-orange-200',
                    'warning-2': 'bg-amber-50 text-amber-700 border-amber-200',
                    'warning-3': 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    none: 'bg-slate-50 text-slate-600 border-slate-200',
                  }[record.warningStatus];

                  return (
                    <tr
                      key={record.rowIndex}
                      className={cn(
                        'transition-colors',
                        isSelected
                          ? 'bg-emerald-50/90 font-medium border-l-4 border-l-emerald-600'
                          : 'odd:bg-white even:bg-slate-50/40 hover:bg-emerald-50/30'
                      )}
                    >
                      {/* Checkbox column: Ticking selects/deselects for batch processing! */}
                      <td className={cn(cellPadding, 'text-center border-r border-slate-200/80')}>
                        <label
                          className="flex items-center justify-center cursor-pointer select-none p-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(record.rowIndex)}
                            disabled={isProcessing || isBatchProcessing}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 accent-emerald-600"
                            title={
                              isSelected
                                ? `Bỏ chọn hồ sơ ${record.soHoSo || record.stt}`
                                : `Tích chọn hồ sơ ${record.soHoSo || record.stt}`
                            }
                          />
                        </label>
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
                        <span className="text-slate-400 italic">Chưa trả</span>
                      </td>

                      {/* THỜI GIAN CÒN LẠI */}
                      <td className={cn(cellPadding, 'whitespace-nowrap')}>
                        <div
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border shadow-2xs',
                            statusColorClass
                          )}
                        >
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {record.tr ? formatTimeRemaining(record.tr) : 'Không xác định'}
                          </span>
                        </div>
                      </td>

                      {/* HOÀN THÀNH RIÊNG LẺ: INSTANT ACTION BUTTON */}
                      <td className={cn(cellPadding, 'text-center')}>
                        <button
                          onClick={() => handleMarkComplete(record)}
                          disabled={isProcessing || isBatchProcessing}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Bấm để hoàn thành và chuyển ngay hồ sơ này xuống phía dưới"
                        >
                          {isProcessing ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Xong</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* SECTION 2: DANH SÁCH HỒ SƠ ĐÃ HOÀN THÀNH (ĐÃ CHUYỂN XUỐNG PHÍA DƯỚI) */}
                {completedList.length > 0 && (
                  <>
                    <tr className="bg-emerald-100 text-emerald-950 font-bold border-y-2 border-emerald-400 select-none">
                      <td colSpan={13} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                            <span className="uppercase text-xs sm:text-sm font-extrabold tracking-wide text-emerald-950">
                              Danh sách hồ sơ đã hoàn thành ({completedList.length}) — Đã chuyển xuống phía dưới
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300">
                            Hiển thị theo thời gian hoàn thành gần nhất
                          </div>
                        </div>
                      </td>
                    </tr>

                    {completedList.map((record, idx) => {
                      return (
                        <tr
                          key={record.rowIndex}
                          className="bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors text-slate-600"
                        >
                          {/* Checkbox column: Shows green checkmark, clicking allows undo */}
                          <td className={cn(cellPadding, 'text-center')}>
                            <button
                              type="button"
                              onClick={() => handleUndoComplete(record)}
                              className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center hover:bg-emerald-700 transition-colors cursor-pointer"
                              title="Hồ sơ đã hoàn thành. Bấm vào đây để Hoàn tác (chuyển lại lên trên)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* STT */}
                          <td className={cn(cellPadding, 'text-center text-slate-400 font-mono')}>
                            {record.stt || idx + 1}
                          </td>

                          {/* SỐ HỒ SƠ */}
                          <td className={cn(cellPadding, 'font-semibold font-mono text-emerald-900 whitespace-nowrap')}>
                            {record.soHoSo || '-'}
                          </td>

                          {/* QUY TRÌNH */}
                          <td
                            className={cn(
                              cellPadding,
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
                              'font-medium text-slate-700',
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
                              'font-medium text-slate-800',
                              isWrapText
                                ? 'whitespace-normal break-words leading-relaxed max-w-[320px]'
                                : 'max-w-[220px] truncate'
                            )}
                            title={record.tenDonVi}
                          >
                            {record.tenDonVi || '-'}
                          </td>

                          {/* CƠ QUAN / CÁN BỘ XL */}
                          <td className={cn(cellPadding, 'text-slate-500')}>
                            <div
                              className={cn(
                                'font-medium',
                                isWrapText ? 'whitespace-normal break-words leading-tight' : 'max-w-[200px] truncate'
                              )}
                              title={record.coQuanXuLy}
                            >
                              {record.coQuanXuLy || '-'}
                            </div>
                            <div
                              className={cn(
                                'text-slate-400 mt-0.5',
                                isWrapText ? 'whitespace-normal break-words leading-tight' : 'max-w-[200px] truncate'
                              )}
                              title={record.canBoXuLy}
                            >
                              {record.canBoXuLy || '-'}
                            </div>
                          </td>

                          {/* NGÀY NHẬN */}
                          <td className={cn(cellPadding, 'text-slate-500 whitespace-nowrap text-center font-mono')}>
                            {record.ngayNhan || '-'}
                          </td>

                          {/* HẠN TRẢ */}
                          <td className={cn(cellPadding, 'text-slate-600 font-semibold whitespace-nowrap text-center font-mono')}>
                            {record.ngayTra || '-'}
                          </td>

                          {/* TRẢ THỰC TẾ: Hiển thị nổi bật ngày giờ trả kết quả */}
                          <td className={cn(cellPadding, 'whitespace-nowrap text-center font-mono')}>
                            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              {record.traThucTe}
                            </span>
                          </td>

                          {/* THỜI GIAN CÒN LẠI: Trạng thái Đúng hạn / Trễ hạn */}
                          <td className={cn(cellPadding, 'whitespace-nowrap')}>
                            <div
                              className={cn(
                                'px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border shadow-2xs',
                                record.isOverdue
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              )}
                            >
                              {record.isOverdue ? (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                                  <span>Trễ hạn ({formatTimeRemaining(record.tr!)})</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                                  <span>Đúng hạn</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Nút Hoàn tác (Undo) */}
                          <td className={cn(cellPadding, 'text-center')}>
                            <button
                              onClick={() => handleUndoComplete(record)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                              title="Bấm để hoàn tác lại hồ sơ này về danh sách Đang xử lý"
                            >
                              <Undo2 className="w-3 h-3 text-slate-500" />
                              <span>Hoàn tác</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
