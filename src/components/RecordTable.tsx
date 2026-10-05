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
import {
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  LayoutGrid,
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
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoPhan, setSelectedBoPhan] = useState<string>('all');
  const [selectedMenu, setSelectedMenu] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
        if (!a.tr) return 1;
        if (!b.tr) return -1;

        return a.tr.totalSeconds - b.tr.totalSeconds;
      });
  }, [records, now]);

  // Unique lists for filter dropdowns
  const uniqueBoPhanList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.boPhanHienTai && r.boPhanHienTai.trim()) {
        set.add(r.boPhanHienTai.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const uniqueMenuList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.menuHienTai && r.menuHienTai.trim()) {
        set.add(r.menuHienTai.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((record) => {
      // 1. Search term matching
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          record.soHoSo?.toLowerCase().includes(q) ||
          record.quyTrinh?.toLowerCase().includes(q) ||
          record.boPhanHienTai?.toLowerCase().includes(q) ||
          record.menuHienTai?.toLowerCase().includes(q) ||
          record.tenDonVi?.toLowerCase().includes(q) ||
          record.coQuanXuLy?.toLowerCase().includes(q) ||
          record.canBoXuLy?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Bo phan filter
      if (selectedBoPhan !== 'all') {
        if (record.boPhanHienTai !== selectedBoPhan) return false;
      }

      // 3. Menu filter
      if (selectedMenu !== 'all') {
        if (record.menuHienTai !== selectedMenu) return false;
      }

      // 4. Status filter
      if (statusFilter === 'overdue') {
        if (record.isCompleted || !record.isOverdue) return false;
      } else if (statusFilter === 'warning') {
        if (record.isCompleted || record.isOverdue || !record.tr || record.tr.totalSeconds > 72 * 3600) return false;
      } else if (statusFilter === 'in_progress') {
        if (record.isCompleted) return false;
      } else if (statusFilter === 'completed') {
        if (!record.isCompleted) return false;
      }

      return true;
    });
  }, [processedRecords, searchTerm, selectedBoPhan, selectedMenu, statusFilter]);

  const overdueCount = processedRecords.filter((r) => !r.isCompleted && r.isOverdue).length;
  const warningCount = processedRecords.filter(
    (r) => !r.isCompleted && !r.isOverdue && r.tr && r.tr.totalSeconds <= 72 * 3600
  ).length;
  const completedCount = processedRecords.filter((r) => r.isCompleted).length;

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
      {/* Alert Banner for Overdue / Warning */}
      {(overdueCount > 0 || warningCount > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3 shadow-sm mx-4 mt-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800 text-sm">Cảnh báo hạn xử lý hồ sơ</h3>
            <p className="text-orange-700 text-xs sm:text-sm mt-1">
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
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="px-4 pt-2 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số hồ sơ, quy trình, bộ phận, cán bộ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {/* Bộ phận hiện tại filter */}
          {uniqueBoPhanList.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedBoPhan}
                onChange={(e) => setSelectedBoPhan(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs"
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
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMenu}
                onChange={(e) => setSelectedMenu(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs"
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
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none text-xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="in_progress">Đang xử lý (chưa xong)</option>
              <option value="overdue">Quá hạn ({overdueCount})</option>
              <option value="warning">Sắp đến hạn ({warningCount})</option>
              <option value="completed">Đã hoàn thành ({completedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto bg-white border-t border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-3 w-12 text-center">STT</th>
              <th className="px-3 py-3 whitespace-nowrap">Số Hồ Sơ</th>
              <th className="px-3 py-3 min-w-[140px]">Quy Trình</th>
              <th className="px-3 py-3 min-w-[130px] text-emerald-800 bg-emerald-50/50">
                Bộ Phận Hiện Tại
              </th>
              <th className="px-3 py-3 min-w-[130px] text-blue-800 bg-blue-50/50">
                Menu Hiện Tại
              </th>
              <th className="px-3 py-3 min-w-[160px]">Tên Đơn Vị / Họ Tên</th>
              <th className="px-3 py-3 min-w-[150px]">Cơ Quan / Cán Bộ XL</th>
              <th className="px-3 py-3 whitespace-nowrap">Ngày Nhận</th>
              <th className="px-3 py-3 whitespace-nowrap">Hạn Trả</th>
              <th className="px-3 py-3 whitespace-nowrap">Trả Thực Tế</th>
              <th className="px-3 py-3 min-w-[170px]">Thời Gian Còn Lại</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Hoàn Thành</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                  {records.length === 0
                    ? 'Không có dữ liệu hồ sơ'
                    : 'Không tìm thấy hồ sơ nào khớp với bộ lọc hiện tại'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, idx) => {
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
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3 py-3 text-center text-slate-500 font-mono">
                      {record.stt || idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {record.soHoSo || '-'}
                    </td>
                    <td
                      className="px-3 py-3 text-slate-700 max-w-[200px] truncate"
                      title={record.quyTrinh}
                    >
                      {record.quyTrinh || '-'}
                    </td>

                    {/* BỘ PHẬN HIỆN TẠI */}
                    <td className="px-3 py-3 bg-emerald-50/20">
                      {record.boPhanHienTai ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100/70 text-emerald-900 border border-emerald-200 max-w-[180px] truncate" title={record.boPhanHienTai}>
                          {record.boPhanHienTai}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    {/* MENU HIỆN TẠI */}
                    <td className="px-3 py-3 bg-blue-50/20">
                      {record.menuHienTai ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100/70 text-blue-900 border border-blue-200 max-w-[180px] truncate" title={record.menuHienTai}>
                          {record.menuHienTai}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    <td
                      className="px-3 py-3 text-slate-900 max-w-[200px] truncate font-medium"
                      title={record.tenDonVi}
                    >
                      {record.tenDonVi || '-'}
                    </td>

                    <td className="px-3 py-3 text-slate-600 text-xs">
                      <div className="font-medium text-slate-800 truncate max-w-[170px]" title={record.coQuanXuLy}>
                        {record.coQuanXuLy || '-'}
                      </div>
                      <div className="text-slate-500 truncate max-w-[170px]" title={record.canBoXuLy}>
                        {record.canBoXuLy || '-'}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {record.ngayNhan || '-'}
                    </td>

                    <td className="px-3 py-3 text-slate-900 font-semibold whitespace-nowrap text-xs">
                      {record.ngayTra || '-'}
                    </td>

                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-xs">
                      {record.traThucTe ? (
                        <span className="text-emerald-700 font-medium">{record.traThucTe}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa trả</span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border shadow-2xs',
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

                    <td className="px-3 py-3 text-center">
                      {record.isCompleted ? (
                        <span
                          className="inline-flex items-center justify-center text-emerald-600 bg-emerald-100 p-1 rounded-full"
                          title="Đã hoàn thành"
                        >
                          <Check className="w-3.5 h-3.5" />
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
