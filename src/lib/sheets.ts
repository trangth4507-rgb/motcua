export interface SheetRecord {
  rowIndex: number;
  stt: string;
  soHoSo: string;
  quyTrinh: string;
  boPhanHienTai: string; // BỘ PHẬN HIỆN TẠI
  menuHienTai: string;   // MENU HIỆN TẠI
  tenDonVi: string;
  coQuanXuLy: string;
  canBoXuLy: string;
  ngayNhan: string;
  ngayTra: string;
  traThucTe: string;
  [key: string]: any;
}

export const WEB_APP_URL_DEFAULT = '';

// Helper to remove accents, lowercase, strip all spaces and punctuation
export function cleanKey(str: string): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Convert any format from Google Apps Script into a standard SheetRecord
export function normalizeRecord(raw: any, index: number, headerMap?: Record<string, number>): SheetRecord {
  const record: SheetRecord = {
    rowIndex: index + 2,
    stt: String(index + 1),
    soHoSo: '',
    quyTrinh: '',
    boPhanHienTai: '',
    menuHienTai: '',
    tenDonVi: '',
    coQuanXuLy: '',
    canBoXuLy: '',
    ngayNhan: '',
    ngayTra: '',
    traThucTe: '',
  };

  if (!raw) return record;

  // Case 1: raw is an array of cells [cell0, cell1, ...]
  if (Array.isArray(raw)) {
    if (headerMap && Object.keys(headerMap).length > 0) {
      // Map using dynamic header indexes
      const getByHeaderKey = (keywords: string[]): string => {
        for (const kw of keywords) {
          for (const [cleanH, colIdx] of Object.entries(headerMap)) {
            if (cleanH.includes(kw)) {
              const val = raw[colIdx];
              if (val != null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
        }
        return '';
      };

      record.stt = getByHeaderKey(['stt', 'sott']) || String(raw[0] ?? index + 1).trim();
      record.soHoSo = getByHeaderKey(['sohoso', 'mahoso', 'shs']);
      record.quyTrinh = getByHeaderKey(['quytrinh', 'thutuc', 'tentrutuc']);
      record.boPhanHienTai = getByHeaderKey(['bophanhientai', 'bophan', 'phongban']);
      record.menuHienTai = getByHeaderKey(['menuhientai', 'menu', 'buocxuly', 'trangthaixuly']);
      record.tenDonVi = getByHeaderKey(['tendonvi', 'hoten', 'chuhoso', 'nguoinop']);
      record.coQuanXuLy = getByHeaderKey(['coquan', 'donvixuly']);
      record.canBoXuLy = getByHeaderKey(['canbo', 'nguoixuly']);
      record.ngayNhan = getByHeaderKey(['ngaynhan', 'tiepnhan']);
      record.ngayTra = getByHeaderKey(['hantra', 'ngayhen', 'ngaytra']);
      record.traThucTe = getByHeaderKey(['trathucte', 'ngaytrathucte', 'thucte']);
      return record;
    }

    // Fallback if no header map: detect column positions by pattern
    record.stt = String(raw[0] ?? index + 1).trim();
    record.soHoSo = String(raw[1] ?? '').trim();
    record.quyTrinh = String(raw[2] ?? '').trim();

    // If 11 or more columns, check if raw[3] or raw[9] looks like boPhan
    if (raw.length >= 11) {
      // If col 9 and 10 exist, check if col 3 is boPhan or tenDonVi
      record.boPhanHienTai = String(raw[3] ?? '').trim();
      record.menuHienTai = String(raw[4] ?? '').trim();
      record.tenDonVi = String(raw[5] ?? '').trim();
      record.coQuanXuLy = String(raw[6] ?? '').trim();
      record.canBoXuLy = String(raw[7] ?? '').trim();
      record.ngayNhan = String(raw[8] ?? '').trim();
      record.ngayTra = String(raw[9] ?? '').trim();
      record.traThucTe = String(raw[10] ?? '').trim();
    } else {
      record.tenDonVi = String(raw[3] ?? '').trim();
      record.coQuanXuLy = String(raw[4] ?? '').trim();
      record.canBoXuLy = String(raw[5] ?? '').trim();
      record.ngayNhan = String(raw[6] ?? '').trim();
      record.ngayTra = String(raw[7] ?? '').trim();
      record.traThucTe = String(raw[8] ?? '').trim();
      record.boPhanHienTai = String(raw[9] ?? '').trim();
      record.menuHienTai = String(raw[10] ?? '').trim();
    }
    return record;
  }

  // Case 2: raw is an object { "BỘ PHẬN HIỆN TẠI": "...", ... }
  if (typeof raw === 'object') {
    if (raw.rowIndex != null) {
      record.rowIndex = Number(raw.rowIndex) || (index + 2);
    }

    // Direct key matches first
    for (const key of Object.keys(raw)) {
      const k = cleanKey(key);
      const val = raw[key] != null ? String(raw[key]).trim() : '';
      if (!val) continue;

      if (
        (k.includes('bophanhientai') ||
          k.includes('bophan') ||
          k.includes('phongban') ||
          k.includes('bphientai') ||
          (k.includes('bp') && k.includes('hientai'))) &&
        !record.boPhanHienTai
      ) {
        record.boPhanHienTai = val;
      } else if (
        (k.includes('menuhientai') ||
          k.includes('menu') ||
          k.includes('buocxuly') ||
          k.includes('mnhientai') ||
          (k.includes('mn') && k.includes('hientai'))) &&
        !record.menuHienTai
      ) {
        record.menuHienTai = val;
      } else if ((k.includes('sohoso') || k.includes('mahoso') || k === 'shs') && !record.soHoSo) {
        record.soHoSo = val;
      } else if ((k.includes('quytrinh') || k.includes('thutuc')) && !record.quyTrinh) {
        record.quyTrinh = val;
      } else if ((k.includes('tendonvi') || k.includes('hoten') || k.includes('chuhoso') || k.includes('nguoinop')) && !record.tenDonVi) {
        record.tenDonVi = val;
      } else if ((k.includes('coquan') || k.includes('donvixuly')) && !record.coQuanXuLy) {
        record.coQuanXuLy = val;
      } else if ((k.includes('canbo') || k.includes('nguoixuly')) && !record.canBoXuLy) {
        record.canBoXuLy = val;
      } else if ((k.includes('ngaynhan') || k.includes('tiepnhan')) && !record.ngayNhan) {
        record.ngayNhan = val;
      } else if ((k.includes('hantra') || k.includes('ngayhen') || (k.includes('ngaytra') && !k.includes('thucte'))) && !record.ngayTra) {
        record.ngayTra = val;
      } else if ((k.includes('trathucte') || k.includes('thucte')) && !record.traThucTe) {
        record.traThucTe = val;
      } else if (k === 'stt' && !record.stt) {
        record.stt = val;
      }
    }
  }

  return record;
}

export function getRecordKey(rec: {
  rowIndex?: number;
  soHoSo?: string;
  tenDonVi?: string;
  quyTrinh?: string;
  ngayNhan?: string;
}): string {
  if (rec.soHoSo && rec.soHoSo.trim()) {
    return `shs_${rec.soHoSo.trim()}`;
  }
  const cleanOwner = cleanKey(rec.tenDonVi || '');
  const cleanProc = cleanKey(rec.quyTrinh || '');
  const cleanDate = cleanKey(rec.ngayNhan || '');
  const identity = `${cleanOwner}_${cleanProc}_${cleanDate}`;
  if (identity.replace(/_/g, '').length > 2) {
    return `rec_${identity}`;
  }
  return `row_${rec.rowIndex ?? 0}`;
}

const COMPLETED_STORAGE_KEY = 'deadline_completed_overrides';

export function getCompletedOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCompletedOverride(
  rowIndexOrRec: number | { rowIndex: number; soHoSo?: string; tenDonVi?: string; quyTrinh?: string; ngayNhan?: string },
  soHoSoOrTimestamp?: string,
  timestampStr?: string
) {
  try {
    const overrides = getCompletedOverrides();
    let key = '';
    let ts = '';
    let shs = '';

    if (typeof rowIndexOrRec === 'object') {
      key = getRecordKey(rowIndexOrRec);
      ts = soHoSoOrTimestamp || '';
      shs = rowIndexOrRec.soHoSo || '';
    } else {
      shs = soHoSoOrTimestamp || '';
      ts = timestampStr || '';
      key = shs.trim() ? `shs_${shs.trim()}` : `row_${rowIndexOrRec}`;
    }

    if (key && ts) {
      overrides[key] = ts;
      if (shs && shs.trim()) {
        overrides[`shs_${shs.trim()}`] = ts;
      }
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (e) {
    console.warn('saveCompletedOverride error:', e);
  }
}

export function removeCompletedOverride(
  rowIndexOrRec: number | { rowIndex: number; soHoSo?: string; tenDonVi?: string; quyTrinh?: string; ngayNhan?: string },
  soHoSo?: string
) {
  try {
    const overrides = getCompletedOverrides();
    let key = '';
    let shs = '';

    if (typeof rowIndexOrRec === 'object') {
      key = getRecordKey(rowIndexOrRec);
      shs = rowIndexOrRec.soHoSo || '';
      delete overrides[String(rowIndexOrRec.rowIndex)];
    } else {
      shs = soHoSo || '';
      key = shs.trim() ? `shs_${shs.trim()}` : `row_${rowIndexOrRec}`;
      delete overrides[String(rowIndexOrRec)];
    }

    delete overrides[key];
    if (shs && shs.trim()) {
      delete overrides[`shs_${shs.trim()}`];
    }
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('removeCompletedOverride error:', e);
  }
}

export function clearAllCompletedOverrides() {
  try {
    localStorage.removeItem(COMPLETED_STORAGE_KEY);
  } catch (e) {
    console.warn('clearAllCompletedOverrides error:', e);
  }
}

export function pruneCompletedOverrides(activeRecords: SheetRecord[]) {
  try {
    const overrides = getCompletedOverrides();
    const activeKeys = new Set<string>();
    activeRecords.forEach((r) => {
      activeKeys.add(getRecordKey(r));
      if (r.soHoSo && r.soHoSo.trim()) {
        activeKeys.add(`shs_${r.soHoSo.trim()}`);
      }
    });

    let changed = false;
    for (const k of Object.keys(overrides)) {
      if (!activeKeys.has(k)) {
        delete overrides[k];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (e) {
    console.warn('pruneCompletedOverrides error:', e);
  }
}

export function saveCompletedOverridesBatch(
  records: { rowIndex: number; soHoSo?: string; tenDonVi?: string; quyTrinh?: string; ngayNhan?: string }[],
  timestampStr: string
) {
  try {
    const overrides = getCompletedOverrides();
    records.forEach((r) => {
      const key = getRecordKey(r);
      overrides[key] = timestampStr;
      if (r.soHoSo && r.soHoSo.trim()) {
        overrides[`shs_${r.soHoSo.trim()}`] = timestampStr;
      }
    });
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('saveCompletedOverridesBatch error:', e);
  }
}

// Robust CSV parser
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }
  return rows;
}

// Parse Google Sheet GViz JSON output if user provided a Google Spreadsheet link
function parseGvizResponse(rawText: string): { records: SheetRecord[]; sheetName: string } {
  const match = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
  const jsonStr = match ? match[1] : rawText;
  const json = JSON.parse(jsonStr);

  const cols = json.table?.cols || [];
  const rows = json.table?.rows || [];

  const headerMap: Record<string, number> = {};
  cols.forEach((col: any, idx: number) => {
    const label = cleanKey(col.label || col.id || '');
    if (label) headerMap[label] = idx;
  });

  const raw2D: any[][] = [];
  rows.forEach((r: any) => {
    const rowVals = (r.c || []).map((cell: any) => (cell ? cell.f || (cell.v != null ? String(cell.v) : '') : ''));
    raw2D.push(rowVals);
  });

  let dataRows = raw2D;
  if (Object.keys(headerMap).length < 3 && raw2D.length > 0) {
    for (let i = 0; i < Math.min(raw2D.length, 4); i++) {
      const keys = raw2D[i].map((c: any) => cleanKey(String(c)));
      const matches = keys.filter((k: string) =>
        ['stt', 'sohoso', 'mahoso', 'quytrinh', 'bophan', 'menu', 'hantra', 'ngaynhan', 'tendonvi'].some(t => k.includes(t))
      ).length;
      if (matches >= 2) {
        keys.forEach((k: string, cIdx: number) => {
          if (k) headerMap[k] = cIdx;
        });
        dataRows = raw2D.slice(i + 1);
        break;
      }
    }
  }

  // Filter out blank rows
  dataRows = dataRows.filter((r) => r.some((c: any) => c && String(c).trim() !== ''));

  const overrides = getCompletedOverrides();
  const records = dataRows.map((item, idx) => {
    const rec = normalizeRecord(item, idx, headerMap);
    if (!rec.traThucTe || rec.traThucTe.trim() === '') {
      const key = getRecordKey(rec);
      const localTimestamp =
        (rec.soHoSo ? overrides[`shs_${rec.soHoSo.trim()}`] : undefined) ||
        overrides[key];
      if (localTimestamp) {
        rec.traThucTe = localTimestamp;
      }
    }
    return rec;
  });

  pruneCompletedOverrides(records);
  return { records, sheetName: 'Google Spreadsheet' };
}

export function getDemoRecords(): SheetRecord[] {
  const now = new Date();
  const formatTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Create dates relative to now
  const dMinus2h = new Date(now.getTime() - 2 * 3600 * 1000);
  const dMinus30m = new Date(now.getTime() - 30 * 60 * 1000);
  const dPlus25m = new Date(now.getTime() + 25 * 60 * 1000);
  const dPlus2h = new Date(now.getTime() + 2 * 3600 * 1000);
  const dPlus6h = new Date(now.getTime() + 6 * 3600 * 1000);
  const dPlus1d = new Date(now.getTime() + 26 * 3600 * 1000);
  const dPlus2d = new Date(now.getTime() + 52 * 3600 * 1000);
  const dPlus5d = new Date(now.getTime() + 120 * 3600 * 1000);
  const dMinus5d = new Date(now.getTime() - 120 * 3600 * 1000);

  return [
    {
      rowIndex: 2,
      stt: '1',
      soHoSo: 'H47.01-261005-0012',
      quyTrinh: 'Đăng ký thành lập hộ kinh doanh cá thể',
      boPhanHienTai: 'Bộ phận Tiếp nhận & Trả kết quả (Một cửa)',
      menuHienTai: 'Đang xử lý - Chờ thẩm định hồ sơ',
      tenDonVi: 'Nguyễn Văn An (Cửa hàng Bách Hóa An Khang)',
      coQuanXuLy: 'UBND Huyện - Phòng Tài chính Kế hoạch',
      canBoXuLy: 'Trần Thị Mai',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dPlus25m),
      traThucTe: '',
    },
    {
      rowIndex: 3,
      stt: '2',
      soHoSo: 'H47.02-261005-0045',
      quyTrinh: 'Cấp Giấy chứng nhận quyền sử dụng đất lần đầu',
      boPhanHienTai: 'Phòng Tài nguyên & Môi trường',
      menuHienTai: 'Đang thẩm tra thực địa & xác minh',
      tenDonVi: 'Lê Hoàng Minh & Nguyễn Thị Lan',
      coQuanXuLy: 'Văn phòng Đăng ký đất đai',
      canBoXuLy: 'Nguyễn Văn Tuấn',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dPlus2h),
      traThucTe: '',
    },
    {
      rowIndex: 4,
      stt: '3',
      soHoSo: 'H47.03-261005-0089',
      quyTrinh: 'Cấp giấy phép xây dựng nhà ở riêng lẻ đô thị',
      boPhanHienTai: 'Phòng Quản lý Đô thị',
      menuHienTai: 'Chờ lãnh đạo phòng phê duyệt',
      tenDonVi: 'Phạm Thanh Bình (Công trình KĐT Mới)',
      coQuanXuLy: 'UBND Huyện - Phòng QLĐT',
      canBoXuLy: 'Vũ Đức Thịnh',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dPlus6h),
      traThucTe: '',
    },
    {
      rowIndex: 5,
      stt: '4',
      soHoSo: 'H47.04-261005-0102',
      quyTrinh: 'Xác nhận tình trạng hôn nhân (cho công dân cư trú)',
      boPhanHienTai: 'Bộ phận Tư pháp - Hộ tịch',
      menuHienTai: 'Đang tra cứu dữ liệu hộ tịch điện tử',
      tenDonVi: 'Đỗ Thị Thu Hương',
      coQuanXuLy: 'UBND Xã / Thị trấn',
      canBoXuLy: 'Lê Thị Thu',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dMinus30m),
      traThucTe: '',
    },
    {
      rowIndex: 6,
      stt: '5',
      soHoSo: 'H47.05-261005-0130',
      quyTrinh: 'Thủ tục chuyển nhượng quyền sử dụng đất',
      boPhanHienTai: 'Chi nhánh Văn phòng Đăng ký đất đai',
      menuHienTai: 'Đã hoàn tất nghĩa vụ thuế, chờ in phôi',
      tenDonVi: 'Hoàng Quốc Cường',
      coQuanXuLy: 'Chi nhánh VP Đăng ký đất đai',
      canBoXuLy: 'Bùi Văn Hùng',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dMinus2h),
      traThucTe: '',
    },
    {
      rowIndex: 7,
      stt: '6',
      soHoSo: 'H47.06-261005-0155',
      quyTrinh: 'Cấp đổi lại thẻ Bảo hiểm y tế do sai thông tin',
      boPhanHienTai: 'Bảo hiểm xã hội huyện',
      menuHienTai: 'Đã phê duyệt hồ sơ',
      tenDonVi: 'Vũ Thị Ngọc Hà',
      coQuanXuLy: 'BHXH Huyện',
      canBoXuLy: 'Phạm Thị Thúy',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dPlus1d),
      traThucTe: '',
    },
    {
      rowIndex: 8,
      stt: '7',
      soHoSo: 'H47.07-261005-0182',
      quyTrinh: 'Cấp trích lục khai sinh từ sổ đăng ký hộ tịch',
      boPhanHienTai: 'Bộ phận Tiếp nhận & Trả kết quả (Một cửa)',
      menuHienTai: 'Chờ công dân đến nhận kết quả',
      tenDonVi: 'Đinh Công Thành',
      coQuanXuLy: 'UBND Phường / Xã',
      canBoXuLy: 'Trần Hoài Nam',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dPlus2d),
      traThucTe: '',
    },
    {
      rowIndex: 9,
      stt: '8',
      soHoSo: 'H47.08-261005-0210',
      quyTrinh: 'Đăng ký biến động quyền sử dụng đất (đổi tên)',
      boPhanHienTai: 'Bộ phận Tiếp nhận & Trả kết quả (Một cửa)',
      menuHienTai: 'Đã trả kết quả cho công dân',
      tenDonVi: 'Ngô Minh Tâm',
      coQuanXuLy: 'Văn phòng Đăng ký đất đai',
      canBoXuLy: 'Nguyễn Văn Tuấn',
      ngayNhan: formatTime(dMinus5d),
      ngayTra: formatTime(dMinus2h),
      traThucTe: formatTime(dMinus2h),
    },
  ];
}

export async function fetchSheetData(
  webAppUrl: string
): Promise<{ records: SheetRecord[]; sheetName: string; error?: string }> {
  try {
    if (!webAppUrl || !webAppUrl.trim()) {
      throw new Error('Vui lòng nhập Web App URL của Apps Script hoặc liên kết Google Sheets');
    }

    const cleanUrl = webAppUrl.trim().replace(/^["']|["']$/g, '');

    // Case 1: User pasted a Google Spreadsheet link instead of Apps Script Web App URL
    if (cleanUrl.includes('docs.google.com/spreadsheets/d/')) {
      const idMatch = cleanUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        const sheetId = idMatch[1];
        const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        const nowTs = Date.now();
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}&tq=&_t=${nowTs}`;

        try {
          const res = await fetch(gvizUrl);
          if (res.ok) {
            const txt = await res.text();
            if (txt.includes('google.visualization.Query.setResponse')) {
              return parseGvizResponse(txt);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Case 2: Standard Google Apps Script Web App URL (Direct browser fetch, fast & reliable)
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${cleanUrl}${separator}_t=${Date.now()}`;

    let responseText: string | null = null;
    let httpStatus: number = 200;

    try {
      const res = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      httpStatus = res.status;
      responseText = await res.text();
    } catch (err: any) {
      console.warn('Direct fetch error:', err);
      throw new Error(
        'Không thể kết nối trực tiếp đến Web App URL. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.'
      );
    }

    if (!responseText) {
      throw new Error(
        'Không thể kết nối đến Web App URL. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.'
      );
    }

    const trimmedText = responseText.trim();

    // 3. Check for Google Drive 404 error (deployment does not exist)
    if (
      httpStatus === 404 ||
      trimmedText.includes('Sorry, the file you have requested does not exist') ||
      trimmedText.includes('<title>Page not found</title>')
    ) {
      throw new Error(
        'ĐƯỜNG DẪN WEB APP KHÔNG TỒN TẠI (Lỗi 404 từ Google Drive):\n\n' +
        'Google thông báo: "Sorry, the file you have requested does not exist."\n\n' +
        '• Nguyên nhân: Mã bản triển khai (Deployment) này đã bị xóa, bị thay thế bằng phiên bản mới hoặc URL bị copy thiếu ký tự.\n\n' +
        '• Cách khắc phục:\n' +
        '1. Mở bảng tính Google Sheets của bạn.\n' +
        '2. Vào menu "Tiện ích mở rộng" (Extensions) ➔ "Apps Script".\n' +
        '3. Bấm nút "Triển khai" (Deploy) màu xanh ở góc trên bên phải ➔ "Quản lý bản triển khai" (Manage deployments).\n' +
        '4. Sao chép lại URL Web App đang hoạt động (kết thúc bằng "/exec") và dán vào ô bên dưới.\n' +
        '(Lưu ý: Thiết lập "Người có quyền truy cập" / Who has access phải chọn là "Bất kỳ ai" / Anyone).'
      );
    }

    // 4. Check for Google login / permissions error
    if (
      trimmedText.includes('accounts.google.com') ||
      trimmedText.includes('ServiceLogin') ||
      (trimmedText.startsWith('<!DOCTYPE html>') && trimmedText.includes('Google Drive'))
    ) {
      throw new Error(
        'WEB APP YÊU CẦU ĐĂNG NHẬP GOOGLE:\n\n' +
        'Vui lòng vào Google Apps Script ➔ "Triển khai" ➔ "Quản lý bản triển khai" ➔ Chỉnh sửa và thiết lập "Người có quyền truy cập" (Who has access) là "Bất kỳ ai" (Anyone), sau đó Lưu và tải lại dữ liệu.'
      );
    }

    // 5. Parse JSON
    let data: any;
    try {
      data = JSON.parse(trimmedText);
    } catch {
      // Check if wrapped in callback
      const callbackMatch = trimmedText.match(/^[a-zA-Z0-9_]+\(([\s\S]*)\);?$/);
      if (callbackMatch) {
        data = JSON.parse(callbackMatch[1]);
      } else {
        throw new Error(
          'Dữ liệu trả về từ Web App không đúng định dạng JSON. Vui lòng kiểm tra lại hàm doGet() trong Apps Script.'
        );
      }
    }

    if (data && data.status === 'error') {
      throw new Error(data.message || 'Lỗi xử lý từ Google Apps Script.');
    }

    // 6. Extract rows list
    let rawList: any[] = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (Array.isArray(data.data)) {
      rawList = data.data;
    } else if (Array.isArray(data.records)) {
      rawList = data.records;
    } else if (Array.isArray(data.rows)) {
      rawList = data.rows;
    } else if (Array.isArray(data.values)) {
      rawList = data.values;
    } else if (Array.isArray(data.result)) {
      rawList = data.result;
    } else if (Array.isArray(data.items)) {
      rawList = data.items;
    } else if (data && typeof data === 'object') {
      for (const k of Object.keys(data)) {
        if (Array.isArray(data[k])) {
          rawList = data[k];
          break;
        }
      }
    }

    // 7. Multi-row Header mapping detection for 2D array matrix
    let headerMap: Record<string, number> | undefined;
    let dataRows = rawList;

    if (rawList.length > 0 && Array.isArray(rawList[0])) {
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(rawList.length, 5); r++) {
        const row = rawList[r];
        if (!Array.isArray(row)) continue;
        const keys = row.map((cell: any) => cleanKey(String(cell)));
        const matchCount = keys.filter((k: string) =>
          ['stt', 'sohoso', 'mahoso', 'shs', 'quytrinh', 'thutuc', 'bophan', 'menu', 'hantra', 'ngaynhan', 'tendonvi', 'canbo', 'coquan', 'trathucte'].some(
            (term) => k.includes(term)
          )
        ).length;

        if (matchCount >= 2) {
          headerRowIdx = r;
          headerMap = {};
          keys.forEach((k: string, idx: number) => {
            if (k) headerMap![k] = idx;
          });
          break;
        }
      }

      if (headerRowIdx >= 0) {
        dataRows = rawList.slice(headerRowIdx + 1);
      }
    }

    // Filter out completely blank rows
    dataRows = dataRows.filter((row: any) => {
      if (!row) return false;
      if (Array.isArray(row)) {
        return row.some((cell: any) => cell != null && String(cell).trim() !== '');
      }
      return Object.values(row).some((val: any) => val != null && String(val).trim() !== '');
    });

    const overrides = getCompletedOverrides();

    const records: SheetRecord[] = dataRows.map((item, idx) => {
      const rec = normalizeRecord(item, idx, headerMap);
      rec.rowIndex = Number(rec.rowIndex) || (idx + 2);

      // If sheet doesn't yet reflect completion, check local overrides by unique key
      if (!rec.traThucTe || rec.traThucTe.trim() === '') {
        const key = getRecordKey(rec);
        const localTimestamp =
          (rec.soHoSo ? overrides[`shs_${rec.soHoSo.trim()}`] : undefined) ||
          overrides[key];
        if (localTimestamp) {
          rec.traThucTe = localTimestamp;
        }
      }
      return rec;
    });

    // Prune stale overrides for records no longer in the sheet
    pruneCompletedOverrides(records);

    return { records, sheetName: data.sheetName || 'Sheet dữ liệu' };
  } catch (error: any) {
    console.error('fetchSheetData error:', error);
    return { records: [], sheetName: '', error: error.message || 'Lỗi khi tải dữ liệu' };
  }
}

export async function markRecordCompleted(
  webAppUrl: string,
  rowIndex: number,
  timestampStr: string
): Promise<boolean> {
  if (!webAppUrl) return false;

  // 1. Try standard POST request
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'markComplete',
        rowIndex: rowIndex,
        timestamp: timestampStr,
      }),
    });

    if (res.ok) {
      try {
        const data = await res.json();
        if (data && (data.status === 'success' || data.success)) return true;
      } catch {
        return true;
      }
    }
  } catch (err) {
    console.warn('POST markComplete attempt failed, falling back to GET:', err);
  }

  // 2. Fallback: GET request (compatible with Google Apps Script doGet)
  try {
    const separator = webAppUrl.includes('?') ? '&' : '?';
    const getUrl = `${webAppUrl}${separator}action=markComplete&rowIndex=${rowIndex}&timestamp=${encodeURIComponent(
      timestampStr
    )}&_t=${Date.now()}`;
    await fetch(getUrl, { mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch (error) {
    console.error('markRecordCompleted fallback error:', error);
  }

  return true;
}

export async function markMultipleRecordsCompleted(
  webAppUrl: string,
  rowIndices: number[],
  timestampStr: string,
  onProgress?: (completedCount: number, total: number) => void
): Promise<{ success: boolean; successCount: number; failedCount: number }> {
  if (!webAppUrl || rowIndices.length === 0) {
    return { success: false, successCount: 0, failedCount: 0 };
  }

  // 1. Try batch action if supported by backend
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'markMultipleComplete',
        rowIndices: rowIndices,
        timestamp: timestampStr,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        if (onProgress) onProgress(rowIndices.length, rowIndices.length);
        return { success: true, successCount: rowIndices.length, failedCount: 0 };
      }
    }
  } catch (e) {
    console.warn('Batch endpoint not available, falling back to parallel chunk execution:', e);
  }

  // 2. Fallback: Process each row in chunks to ensure full compatibility
  let successCount = 0;
  let failedCount = 0;
  const total = rowIndices.length;
  const chunkSize = 4;

  for (let i = 0; i < rowIndices.length; i += chunkSize) {
    const chunk = rowIndices.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((idx) => markRecordCompleted(webAppUrl, idx, timestampStr))
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        successCount++;
      } else {
        failedCount++;
      }
    }
    if (onProgress) {
      onProgress(successCount + failedCount, total);
    }
  }

  return {
    success: successCount > 0,
    successCount,
    failedCount,
  };
}

export async function updateRecordField(
  webAppUrl: string,
  rowIndex: number,
  columnName: string,
  value: string
): Promise<boolean> {
  try {
    if (!webAppUrl) return false;

    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateField',
        rowIndex: rowIndex,
        columnName: columnName,
        value: value,
      }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'success';
  } catch (error) {
    console.error('updateRecordField error:', error);
    return false;
  }
}

