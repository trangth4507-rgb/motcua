import React, { useState, useEffect, useMemo } from 'react';
import { SheetRecord, markRecordCompleted } from '../lib/sheets';
import {
  parseDate,
  calculateTimeRemaining,
  formatTimeRemaining,
  getWarningStatus,
  getCurrentDateStr,
} from '../lib/dateUtils';
import { cn } from '../lib/utils';
import { Check, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

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
          isCompleted,
          tr,
          warningStatus,
          isOverdue,
        };
      })
      .sort((a, b) => {
        // 1. Incomplete records always come before completed ones
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }

        // 2. Sort by time remaining (totalSeconds ascending)
        // Most negative (most overdue) comes first, then closest to 0 (approaching deadline)
        if (!a.tr) return 1;
        if (!b.tr) return -1;

        return a.tr.totalSeconds - b.tr.totalSeconds;
      });
  }, [records, now]);

  const overdueCount = processedRecords.filter((r) => !r.isCompleted && r.isOverdue).length;
  const warningCount = processedRecords.filter(
    (r) => !r.isCompleted && !r.isOverdue && r.tr && r.tr.totalSeconds <= 72 * 3600
  ).length;

  const handleMarkComplete = async (record: SheetRecord) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đánh dấu hoàn thành hồ sơ ${record.soHoSo}? Thao tác này sẽ ghi nhận thời gian trả thực tế vào Google Sheet.`
    );
    if (!confirmed) return;

    setProcessingRows((prev) => new Set(prev).add(record.rowIndex));
    const timestampStr = getCurrentDateStr();

    const success = await markRecordCompleted(
      webAppUrl,
      record.rowIndex,
      timestampStr
    );

    setProcessingRows((prev) => {
      const next = new Set(prev);
      next.delete(record.rowIndex);
      return next;
    });

    if (success) {
      onRefresh();
    } else {
      alert('Có lỗi xảy ra khi cập nhật Google Sheet qua Apps Script.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {(overdueCount > 0 || warningCount > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3 shadow-sm mx-4 mt-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800">Cảnh báo hạn xử lý hồ sơ</h3>
            <p className="text-orange-700 text-sm mt-1">
              {overdueCount > 0 && (
                <span className="block sm:inline sm:mr-2">
                  Có <strong className="font-bold">{overdueCount}</strong> hồ sơ đang <strong className="font-bold text-red-600">quá hạn</strong>.
                </span>
              )}
              {warningCount > 0 && (
                <span className="block sm:inline">
                  Có <strong className="font-bold">{warningCount}</strong> hồ sơ <strong className="font-bold">sắp đến hạn</strong> trong 3 ngày tới.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-t border-slate-200">
            <tr>
              <th className="px-4 py-3">STT</th>
              <th className="px-4 py-3">Số Hồ Sơ</th>
              <th className="px-4 py-3">Quy Trình</th>
              <th className="px-4 py-3">Tên Đơn Vị / Họ Tên</th>
              <th className="px-4 py-3">Cơ Quan / Cán Bộ XL</th>
              <th className="px-4 py-3">Ngày Nhận</th>
              <th className="px-4 py-3">Hạn Trả</th>
              <th className="px-4 py-3">Trả Thực Tế</th>
              <th className="px-4 py-3">Thời Gian Còn Lại</th>
              <th className="px-4 py-3 text-center">Hoàn Thành</th>
            </tr>
          </thead>
          <tbody>
            {processedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              processedRecords.map((record, idx) => {
                const statusColorClass = !record.isCompleted
                  ? {
                      overdue: 'bg-red-50 text-red-700',
                      'warning-1': 'bg-orange-50 text-orange-700',
                      'warning-2': 'bg-amber-50 text-amber-700',
                      'warning-3': 'bg-yellow-50 text-yellow-700',
                      safe: 'bg-emerald-50 text-emerald-700',
                      none: 'bg-slate-50 text-slate-600',
                    }[record.warningStatus]
                  : record.isOverdue
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700';

                return (
                  <tr
                    key={record.rowIndex}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">{record.stt || idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{record.soHoSo}</td>
                    <td
                      className="px-4 py-3 text-slate-600 truncate max-w-[150px]"
                      title={record.quyTrinh}
                    >
                      {record.quyTrinh}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-900 max-w-[200px] truncate"
                      title={record.tenDonVi}
                    >
                      {record.tenDonVi}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div className="font-medium text-slate-800">{record.coQuanXuLy}</div>
                      <div>{record.canBoXuLy}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {record.ngayNhan}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">
                      {record.ngayTra}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {record.traThucTe || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={cn(
                          'px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5',
                          statusColorClass
                        )}
                      >
                        {record.isCompleted ? (
                          <>
                            {record.isOverdue ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            {record.isOverdue
                              ? `Đã hoàn thành nhưng trễ hạn (${formatTimeRemaining(record.tr!)})`
                              : 'Đã hoàn thành đúng hạn'}
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            {record.tr ? formatTimeRemaining(record.tr) : 'Không xác định'}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
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
                          disabled={processingRows.has(record.rowIndex)}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50"
                          title="Đánh dấu hoàn thành"
                        >
                          {processingRows.has(record.rowIndex) ? (
                            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                          ) : (
                            <Check className="w-5 h-5" />
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

