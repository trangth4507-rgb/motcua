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

// Exhaustive Vietnamese keyword dictionary for public administrative records
export const HEADER_KEYWORDS: Record<string, string[]> = {
  stt: ['stt', 'sott', 'thutu', 'sothutu', 'tt'],
  soHoSo: ['sohoso', 'mahoso', 'shs', 'sohs', 'mahs', 'hoso', 'sobiennhan', 'sohieu', 'sohd', 'madon', 'sodon'],
  quyTrinh: ['quytrinh', 'thutuc', 'tenthutuc', 'tenquytrinh', 'tthc', 'linhvuc', 'tenhoso', 'noidung', 'congviec', 'tencongviec', 'tenhs'],
  boPhanHienTai: ['bophanhientai', 'bophan', 'phongban', 'bphientai', 'phong', 'donvihientai', 'vitrihientai', 'buochientai', 'donvichutri', 'bophanthuchien', 'donvithuly'],
  menuHienTai: ['menuhientai', 'menu', 'buocxuly', 'trangthaixuly', 'trangthai', 'mnhientai', 'buoc', 'quytrinhxuly', 'khau', 'khauxuly', 'tiendo'],
  tenDonVi: ['tendonvi', 'hoten', 'chuhoso', 'nguoinop', 'nguoidung', 'tochuc', 'canhan', 'khachhang', 'tendoituong', 'chudautu', 'nguoiyeucau', 'ongba', 'tennguoinop', 'chuthe', 'doituong', 'tencn'],
  coQuanXuLy: ['coquan', 'donvixuly', 'coquanxuly', 'donvi', 'phongchuyenmon', 'coquanthuchien', 'cqxl'],
  canBoXuLy: ['canbo', 'nguoixuly', 'canbothuly', 'chuyenvien', 'nguoithuchien', 'canboxuly', 'cbtl', 'cbxl', 'chuyenvienthuly'],
  ngayNhan: ['ngaynhan', 'tiepnhan', 'ngaytiepnhan', 'thoigiannhan', 'ngayvao', 'ngaynophoso', 'ngaynop', 'thoigiantiepnhan'],
  ngayTra: ['hantra', 'ngayhen', 'ngaytra', 'hangiaiquyet', 'ngayhentra', 'hanchot', 'thoigianhantra', 'thoigianhen', 'denngay', 'hanchotxuly', 'thoigiangiaiquyet', 'hentra'],
  traThucTe: ['trathucte', 'ngaytrathucte', 'thucte', 'ngayhoanthanh', 'ngaytrakq', 'ngayketthuc', 'daxuly', 'ngayxuly', 'thoigiantra', 'ngaychitra'],
};

export function matchFieldFromCleanHeader(cleanHeader: string): string | null {
  if (!cleanHeader || cleanHeader.length <= 1) return null;
  for (const [field, keywords] of Object.entries(HEADER_KEYWORDS)) {
    for (const kw of keywords) {
      if (cleanHeader === kw || cleanHeader.includes(kw)) {
        return field;
      }
    }
  }
  return null;
}

// Convert any format from Google Sheets or Apps Script into a standard SheetRecord
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
    // Only trust headerMap if it contains actual meaningful header labels (not just 'a', 'b', 'c' from Google col.id)
    const validHeaderEntries = headerMap
      ? Object.entries(headerMap).filter(([k]) => k.length > 1 && !/^[a-z]$/.test(k))
      : [];

    if (validHeaderEntries.length > 0) {
      const getByHeaderKey = (keywords: string[]): string => {
        for (const kw of keywords) {
          for (const [cleanH, colIdx] of validHeaderEntries) {
            if (cleanH === kw || cleanH.includes(kw)) {
              const val = raw[colIdx];
              if (val != null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
        }
        return '';
      };

      record.stt = getByHeaderKey(HEADER_KEYWORDS.stt) || String(raw[0] ?? index + 1).trim();
      record.soHoSo = getByHeaderKey(HEADER_KEYWORDS.soHoSo);
      record.quyTrinh = getByHeaderKey(HEADER_KEYWORDS.quyTrinh);
      record.boPhanHienTai = getByHeaderKey(HEADER_KEYWORDS.boPhanHienTai);
      record.menuHienTai = getByHeaderKey(HEADER_KEYWORDS.menuHienTai);
      record.tenDonVi = getByHeaderKey(HEADER_KEYWORDS.tenDonVi);

      // Distinguish coQuan vs canBo
      const coQuanVal = getByHeaderKey(HEADER_KEYWORDS.coQuanXuLy);
      let canBoVal = '';
      for (const kw of HEADER_KEYWORDS.canBoXuLy) {
        for (const [cleanH, colIdx] of validHeaderEntries) {
          // If this column is dedicated to canbo and doesn't mention coquan
          if ((cleanH === kw || cleanH.includes(kw)) && !cleanH.includes('coquan')) {
            const val = raw[colIdx];
            if (val != null && String(val).trim() !== '') {
              canBoVal = String(val).trim();
              break;
            }
          }
        }
        if (canBoVal) break;
      }

      record.coQuanXuLy = coQuanVal;
      record.canBoXuLy = canBoVal;
      record.ngayNhan = getByHeaderKey(HEADER_KEYWORDS.ngayNhan);
      record.ngayTra = getByHeaderKey(HEADER_KEYWORDS.ngayTra);
      record.traThucTe = getByHeaderKey(HEADER_KEYWORDS.traThucTe);
    }

    // Safety Fallback for any fields still empty (positional and pattern recognition)
    if (!record.stt) record.stt = String(raw[0] ?? index + 1).trim();
    if (!record.soHoSo && raw[1] != null && String(raw[1]).trim()) record.soHoSo = String(raw[1]).trim();
    if (!record.quyTrinh && raw[2] != null && String(raw[2]).trim()) record.quyTrinh = String(raw[2]).trim();

    if (raw.length >= 10) {
      if (!record.boPhanHienTai && raw[3] != null) record.boPhanHienTai = String(raw[3]).trim();
      if (!record.menuHienTai && raw[4] != null) record.menuHienTai = String(raw[4]).trim();
      if (!record.tenDonVi && raw[5] != null) record.tenDonVi = String(raw[5]).trim();
      if (!record.coQuanXuLy && raw[6] != null) record.coQuanXuLy = String(raw[6]).trim();
      if (raw.length >= 11) {
        if (!record.canBoXuLy && raw[7] != null) record.canBoXuLy = String(raw[7]).trim();
        if (!record.ngayNhan && raw[8] != null) record.ngayNhan = String(raw[8]).trim();
        if (!record.ngayTra && raw[9] != null) record.ngayTra = String(raw[9]).trim();
        if (!record.traThucTe && raw[10] != null) record.traThucTe = String(raw[10]).trim();
      } else {
        if (!record.ngayNhan && raw[7] != null) record.ngayNhan = String(raw[7]).trim();
        if (!record.ngayTra && raw[8] != null) record.ngayTra = String(raw[8]).trim();
        if (!record.traThucTe && raw[9] != null) record.traThucTe = String(raw[9]).trim();
      }
    } else {
      if (!record.tenDonVi && raw[3] != null) record.tenDonVi = String(raw[3]).trim();
      if (!record.coQuanXuLy && raw[4] != null) record.coQuanXuLy = String(raw[4]).trim();
      if (!record.ngayNhan && raw[5] != null) record.ngayNhan = String(raw[5]).trim();
      if (!record.ngayTra && raw[6] != null) record.ngayTra = String(raw[6]).trim();
    }

    // Date Pattern Fallback: if ngayTra is still empty, scan raw row cells for dates!
    if (!record.ngayTra || !record.ngayNhan) {
      const dateCells: string[] = [];
      for (let c = 1; c < raw.length; c++) {
        const valStr = String(raw[c] || '').trim();
        if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(valStr)) {
          dateCells.push(valStr);
        }
      }
      if (dateCells.length >= 2) {
        if (!record.ngayNhan) record.ngayNhan = dateCells[0];
        if (!record.ngayTra) record.ngayTra = dateCells[1];
      } else if (dateCells.length === 1 && !record.ngayTra) {
        record.ngayTra = dateCells[0];
      }
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

      const matched = matchFieldFromCleanHeader(k);
      if (matched === 'boPhanHienTai' && !record.boPhanHienTai) record.boPhanHienTai = val;
      else if (matched === 'menuHienTai' && !record.menuHienTai) record.menuHienTai = val;
      else if (matched === 'soHoSo' && !record.soHoSo) record.soHoSo = val;
      else if (matched === 'quyTrinh' && !record.quyTrinh) record.quyTrinh = val;
      else if (matched === 'tenDonVi' && !record.tenDonVi) record.tenDonVi = val;
      else if (matched === 'coQuanXuLy' && !record.coQuanXuLy) record.coQuanXuLy = val;
      else if (matched === 'canBoXuLy' && !record.canBoXuLy) record.canBoXuLy = val;
      else if (matched === 'ngayNhan' && !record.ngayNhan) record.ngayNhan = val;
      else if (matched === 'ngayTra' && !record.ngayTra) record.ngayTra = val;
      else if (matched === 'traThucTe' && !record.traThucTe) record.traThucTe = val;
      else if (k === 'stt' && !record.stt) record.stt = val;
    }

    // Smart splitting for combined "Cơ quan / Cán bộ XL" column
    if (!record.canBoXuLy && record.coQuanXuLy) {
      if (record.coQuanXuLy.includes('/') || record.coQuanXuLy.includes(' - ')) {
        const parts = record.coQuanXuLy.split(/[\/\-]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          record.coQuanXuLy = parts[0];
          record.canBoXuLy = parts.slice(1).join(' - ');
        }
      }
    }

    // Smart date scanner fallback for object rows
    if (!record.ngayTra || !record.ngayNhan) {
      const dateVals: string[] = [];
      for (const v of Object.values(raw)) {
        const vStr = String(v ?? '').trim();
        if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(vStr)) {
          dateVals.push(vStr);
        }
      }
      if (dateVals.length >= 2) {
        if (!record.ngayNhan) record.ngayNhan = dateVals[0];
        if (!record.ngayTra) record.ngayTra = dateVals[1];
      } else if (dateVals.length === 1 && !record.ngayTra) {
        record.ngayTra = dateVals[0];
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

// JSONP loader for Google Visualization Query API (Completely bypasses CORS restrictions)
export function fetchGvizJsonp(sheetId: string, gidParam: string = ''): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbId = `gviz_cb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement('script');
    let finished = false;

    const cleanup = () => {
      try {
        delete (window as any)[cbId];
      } catch {}
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        reject(new Error('Hết thời gian kết nối Google GViz (timeout sau 10s)'));
      }
    }, 10000);

    (window as any)[cbId] = (response: any) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        cleanup();
        resolve(response);
      }
    };

    script.onerror = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('Lỗi tải dữ liệu Google Sheets qua JSONP'));
      }
    };

    const cacheBuster = `&_t=${Date.now()}`;
    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${cbId}${gidParam}${cacheBuster}`;
    document.head.appendChild(script);
  });
}

// Fallback loader using local proxy if available
export async function fetchProxyGvizOrCsv(sheetId: string, gidParam: string = ''): Promise<{ records: SheetRecord[]; sheetName: string }> {
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gidParam}&_t=${Date.now()}`;
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(gvizUrl)}`);
    if (res.ok) {
      const txt = await res.text();
      if (txt.includes('google.visualization.Query.setResponse') || txt.includes('"table"')) {
        return parseGvizResponse(txt);
      }
    }
  } catch (err) {
    console.warn('Proxy GViz attempt failed:', err);
  }

  // Try CSV export via proxy
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}&_t=${Date.now()}`;
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(csvUrl)}`);
    if (res.ok) {
      const csvTxt = await res.text();
      if (csvTxt && csvTxt.trim().length > 0) {
        const rows = parseCsv(csvTxt);
        if (rows.length > 0) {
          return parse2DArrayRecords(rows);
        }
      }
    }
  } catch (err) {
    console.warn('Proxy CSV attempt failed:', err);
  }

  throw new Error('Không thể tải qua proxy');
}

// Safely format cell values from Google Visualization API or 2D matrices
export function formatGvizCellValue(cell: any): string {
  if (cell == null) return '';
  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell).trim();
  }
  // cell is an object { v: ..., f: ... }
  if (cell.f != null && String(cell.f).trim() !== '') {
    return String(cell.f).trim();
  }
  if (cell.v != null) {
    const v = String(cell.v).trim();
    // Google GViz Date format: Date(year, monthIndex, day, hours, minutes, seconds)
    const match = v.match(/Date\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?\)/);
    if (match) {
      const year = match[1];
      const month = String(Number(match[2]) + 1).padStart(2, '0');
      const day = String(Number(match[3])).padStart(2, '0');
      const hour = match[4] ? String(Number(match[4])).padStart(2, '0') : '';
      const min = match[5] ? String(Number(match[5])).padStart(2, '0') : '';
      if (hour && min) {
        return `${day}/${month}/${year} ${hour}:${min}`;
      }
      return `${day}/${month}/${year}`;
    }
    return v;
  }
  return '';
}

// Scans the first few rows to locate the real header row and map all columns
export function detectHeaderRow(raw2D: any[][]): {
  headerRowIdx: number;
  colMap: Record<string, number>;
  matchedCount: number;
} {
  let bestRowIdx = -1;
  let bestColMap: Record<string, number> = {};
  let bestScore = 0;

  const maxScan = Math.min(raw2D.length, 10);
  for (let r = 0; r < maxScan; r++) {
    const row = raw2D[r];
    if (!Array.isArray(row)) continue;

    const currentMap: Record<string, number> = {};
    const matchedFields = new Set<string>();

    row.forEach((cellVal: any, colIdx: number) => {
      const strVal = String(cellVal || '').trim();
      const clean = cleanKey(strVal);
      if (!clean) return;

      currentMap[clean] = colIdx;
      const matchedField = matchFieldFromCleanHeader(clean);
      if (matchedField) {
        matchedFields.add(matchedField);
        if (currentMap[matchedField] === undefined) {
          currentMap[matchedField] = colIdx;
        }
      }
    });

    const score = matchedFields.size;
    if (score > bestScore) {
      bestScore = score;
      bestRowIdx = r;
      bestColMap = currentMap;
    }
  }

  return {
    headerRowIdx: bestRowIdx,
    colMap: bestColMap,
    matchedCount: bestScore,
  };
}

// Convert 2D array matrix into SheetRecord[]
export function parse2DArrayRecords(rawList: any[][]): { records: SheetRecord[]; sheetName: string } {
  let headerMap: Record<string, number> = {};
  let dataRows = rawList;

  if (rawList.length > 0 && Array.isArray(rawList[0])) {
    const detected = detectHeaderRow(rawList);
    if (detected.headerRowIdx >= 0) {
      headerMap = detected.colMap;
      dataRows = rawList.slice(detected.headerRowIdx + 1);
    } else {
      const firstCell = String(rawList[0][0] || '').trim();
      if (firstCell && (cleanKey(firstCell) === 'stt' || isNaN(Number(firstCell)))) {
        dataRows = rawList.slice(1);
      }
    }
  }

  // Filter out blank rows and any remaining header row text
  dataRows = dataRows.filter((row: any) => {
    if (!row) return false;
    if (Array.isArray(row)) {
      const c0 = cleanKey(String(row[0] || ''));
      const c1 = cleanKey(String(row[1] || ''));
      if (c0 === 'stt' || c1 === 'sohoso' || c1 === 'mahoso' || c1 === 'shs') return false;
      return row.some((cell: any) => cell != null && String(cell).trim() !== '');
    }
    return Object.values(row).some((val: any) => val != null && String(val).trim() !== '');
  });

  const overrides = getCompletedOverrides();
  const records: SheetRecord[] = dataRows.map((item, idx) => {
    const rec = normalizeRecord(item, idx, headerMap);
    rec.rowIndex = Number(rec.rowIndex) || (idx + 2);

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
  return { records, sheetName: 'Google Sheets' };
}

// Parse Google Sheet GViz JSON output (works with both text and pre-parsed JSON from JSONP)
export function parseGvizResponse(rawTextOrJson: any): { records: SheetRecord[]; sheetName: string } {
  let json: any;
  if (typeof rawTextOrJson === 'string') {
    const match = rawTextOrJson.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
    const jsonStr = match ? match[1] : rawTextOrJson;
    json = JSON.parse(jsonStr);
  } else {
    json = rawTextOrJson;
  }

  if (json.status === 'error') {
    const errMsg = json.errors?.[0]?.message || json.errors?.[0]?.detailed_message || 'Lỗi truy vấn từ Google Sheets';
    throw new Error(`Google Sheets thông báo: ${errMsg}`);
  }

  const cols = json.table?.cols || [];
  const rows = json.table?.rows || [];

  // 1. Build 2D matrix of clean, formatted values
  const raw2D: any[][] = [];
  rows.forEach((r: any) => {
    const rowVals = (r.c || []).map((cell: any) => formatGvizCellValue(cell));
    raw2D.push(rowVals);
  });

  // 2. Check if cols has real meaningful header labels (not just empty or 'A', 'B')
  const colsHeaderMap: Record<string, number> = {};
  let colsHasRealHeaders = false;
  cols.forEach((col: any, idx: number) => {
    if (col && col.label && String(col.label).trim()) {
      const clean = cleanKey(String(col.label));
      if (clean && clean.length > 1 && !/^[a-z]$/.test(clean)) {
        colsHeaderMap[clean] = idx;
        const matchedField = matchFieldFromCleanHeader(clean);
        if (matchedField) {
          colsHeaderMap[matchedField] = idx;
          colsHasRealHeaders = true;
        }
      }
    }
  });

  let headerMap: Record<string, number> = {};
  let dataRows: any[][] = raw2D;

  if (colsHasRealHeaders && Object.keys(colsHeaderMap).length >= 2) {
    headerMap = colsHeaderMap;
  } else {
    // Scan raw2D for the actual header row
    const detected = detectHeaderRow(raw2D);
    if (detected.headerRowIdx >= 0) {
      headerMap = detected.colMap;
      dataRows = raw2D.slice(detected.headerRowIdx + 1);
    } else if (raw2D.length > 0) {
      // If row 0 cell 0 is non-numeric, assume row 0 is header
      const firstCell = String(raw2D[0][0] || '').trim();
      if (firstCell && (cleanKey(firstCell) === 'stt' || isNaN(Number(firstCell)))) {
        dataRows = raw2D.slice(1);
      }
    }
  }

  // 3. Filter out blank rows and any lingering header rows
  dataRows = dataRows.filter((r) => {
    if (!r || !Array.isArray(r)) return false;
    const c0 = cleanKey(String(r[0] || ''));
    const c1 = cleanKey(String(r[1] || ''));
    if (c0 === 'stt' || c1 === 'sohoso' || c1 === 'mahoso' || c1 === 'shs') return false;
    return r.some((c: any) => c != null && String(c).trim() !== '');
  });

  const overrides = getCompletedOverrides();
  const records = dataRows.map((item, idx) => {
    const rec = normalizeRecord(item, idx, headerMap);
    rec.rowIndex = idx + 2;
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
  return { records, sheetName: 'Google Sheets trực tiếp' };
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
      throw new Error('Vui lòng nhập Web App URL của Google Apps Script (kết thúc bằng /exec)');
    }

    let cleanUrl = webAppUrl.trim().replace(/^["']|["']$/g, '');

    // Nếu người dùng lỡ dán link Google Sheets thay vì link Apps Script
    const isGoogleSpreadsheet =
      (cleanUrl.includes('docs.google.com/spreadsheets') || cleanUrl.includes('drive.google.com')) &&
      !cleanUrl.includes('script.google.com');

    if (isGoogleSpreadsheet) {
      throw new Error(
        'BẠN ĐANG DÁN ĐƯỜNG LIÊN KẾT BẢNG TÍNH GOOGLE SHEETS:\n\n' +
        'Để ứng dụng tự động đồng bộ ổn định và nhận dữ liệu mới tức thì khi bạn thay thế dữ liệu trong sheet, hệ thống kết nối chuẩn qua Web App URL của Google Apps Script.\n\n' +
        '👉 Các bước kết nối cực nhanh trong 30 giây:\n' +
        '1. Mở bảng tính Google Sheets của bạn ➔ Tiện ích mở rộng (Extensions) ➔ Apps Script.\n' +
        '2. Dán đoạn mã Apps Script chuẩn (bấm nút "Hướng dẫn kết nối" ở góc phải để sao chép mã).\n' +
        '3. Bấm "Triển khai" ➔ "Bản triển khai mới" ➔ Chọn loại: "Ứng dụng web" (Người có quyền truy cập: "Bất kỳ ai").\n' +
        '4. Sao chép URL ứng dụng web (kết thúc bằng /exec) và dán vào ô bên trên.\n\n' +
        '💡 CHỈ CẦN LÀM 1 LẦN DUY NHẤT: Bất cứ khi nào bạn chỉnh sửa hoặc nhập thay thế dữ liệu mới vào đúng bảng tính đó, ứng dụng sẽ tự động tải dữ liệu mới nhất mà KHÔNG BAO GIỜ báo lỗi!'
      );
    }

    // Nếu người dùng dán link trình soạn thảo Apps Script (/edit)
    if (cleanUrl.includes('script.google.com/home/projects') || (cleanUrl.includes('script.google.com') && cleanUrl.includes('/edit'))) {
      throw new Error(
        'ĐÂY LÀ ĐƯỜNG DẪN TRÌNH SOẠN THẢO APPS SCRIPT (Không phải Web App URL):\n\n' +
        '• Cách lấy đúng link Web App:\n' +
        '1. Trong Apps Script, bấm nút màu xanh "Triển khai" (Deploy) ở góc trên bên phải.\n' +
        '2. Chọn "Quản lý bản triển khai" (Manage deployments).\n' +
        '3. Sao chép "URL ứng dụng web" (kết thúc bằng /exec) và dán vào đây.\n\n' +
        '💡 Sau khi dán URL này, mỗi khi bạn thay thế dữ liệu trong sheet, ứng dụng sẽ tự động tải dữ liệu mới mà không cần thao tác lại.'
      );
    }

    // Tự động chuyển /dev thành /exec nếu người dùng lỡ copy link test
    if (cleanUrl.includes('script.google.com/macros/s/') && cleanUrl.endsWith('/dev')) {
      cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
    }

    if (cleanUrl.includes('script.google.com')) {
      localStorage.setItem('deadline_master_webapp_url', cleanUrl);
    }

    let text = '';

    // Chiến lược 1: Gọi trực tiếp URL Web App (Trình duyệt tự động theo redirect của Google sang script.googleusercontent.com)
    try {
      const directRes = await fetch(cleanUrl, {
        method: 'GET',
        cache: 'no-store',
      });
      if (directRes.ok) {
        const dTxt = await directRes.text();
        if (dTxt && !dTxt.includes('Sorry, the file you have requested does not exist') && !dTxt.includes('<!DOCTYPE html>')) {
          text = dTxt;
        } else if (!text) {
          text = dTxt;
        }
      }
    } catch (e) {
      console.warn('Direct Apps Script fetch error:', e);
    }

    // Chiến lược 2: Nếu trực tiếp chưa được, thử gọi qua Proxy (/api/proxy) nếu đang chạy trong môi trường dev
    if (!text || text.includes('Sorry, the file you have requested does not exist')) {
      try {
        const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(cleanUrl)}`);
        if (proxyRes.ok) {
          const pTxt = await proxyRes.text();
          if (pTxt && !pTxt.includes('Sorry, the file you have requested does not exist') && !pTxt.includes('<!DOCTYPE html>')) {
            text = pTxt;
          }
        }
      } catch (e) {
        console.warn('Proxy Apps Script fetch error:', e);
      }
    }

    // Kiểm tra lỗi 404 từ Google Drive
    if (
      !text ||
      text.includes('Sorry, the file you have requested does not exist') ||
      text.includes('Page not found') ||
      text.includes('does not exist')
    ) {
      throw new Error(
        'ĐƯỜNG DẪN WEB APP APPS SCRIPT CHƯA SẴN SÀNG (Lỗi 404 từ Google Drive):\n\n' +
        'Google thông báo: "Sorry, the file you have requested does not exist."\n\n' +
        '• Nguyên nhân: Bản triển khai Apps Script này chưa được cấp quyền công khai "Bất kỳ ai" (Anyone), hoặc URL bị copy thiếu ký tự.\n\n' +
        '👉 Cách xử lý nhanh trong 30 giây:\n' +
        '1. Trên bảng tính Google Sheets của bạn ➔ Tiện ích mở rộng ➔ Apps Script.\n' +
        '2. Bấm nút màu xanh "Triển khai" (Deploy) ➔ Chọn "Quản lý bản triển khai".\n' +
        '3. Kiểm tra mục "Người có quyền truy cập" (Who has access) xem đã là "Bất kỳ ai" (Anyone) chưa. Nếu chưa, bấm biểu tượng cây bút để sửa thành "Bất kỳ ai".\n' +
        '4. Sao chép lại URL ứng dụng web (kết thúc bằng /exec) và dán vào ô bên trên.\n\n' +
        '💡 CHỈ CẦN THIẾT LẬP 1 LẦN DUY NHẤT: Sau này bạn nhập, sửa hoặc thay thế dữ liệu mới vào đúng bảng tính đó, ứng dụng sẽ tự động tải dữ liệu mới nhất mà KHÔNG BAO GIỜ báo lỗi!'
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        'Phản hồi từ Google Apps Script không phải là JSON hợp lệ. ' +
        (text.length < 150 ? `Nội dung nhận được: "${text}"` : 'Vui lòng kiểm tra lại đường dẫn Web App.')
      );
    }

    if (data && data.status === 'error') {
      throw new Error(data.message || 'Lỗi xử lý từ Google Apps Script.');
    }

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
    }

    // Nếu trả về dạng ma trận mảng 2 chiều raw
    if (rawList.length > 0 && Array.isArray(rawList[0])) {
      return parse2DArrayRecords(rawList);
    }

    // Nếu data.data rỗng hoặc ít thông tin nhưng có data.raw (ma trận 2 chiều do Apps Script nâng cao trả về)
    if (Array.isArray(data.raw) && data.raw.length > 1) {
      const parsed2D = parse2DArrayRecords(data.raw);
      if (parsed2D.records.length > 0) {
        return { records: parsed2D.records, sheetName: data.sheetName || parsed2D.sheetName };
      }
    }

    const overrides = getCompletedOverrides();
    const records: SheetRecord[] = rawList.map((item, idx) => {
      const rec = normalizeRecord(item, idx);
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
    console.warn('fetchSheetData error:', error);
    return { records: [], sheetName: '', error: error.message || 'Lỗi khi tải dữ liệu từ Google Sheets' };
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

// Mã nguồn chuẩn của Google Apps Script (tự động nhận diện dữ liệu mới, an toàn 100% khi thay thế sheet)
export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Tự động lấy sheet có dữ liệu (ưu tiên sheet đang mở, nếu rỗng thì quét tìm sheet có nhiều dòng nhất)
    var sheet = ss.getActiveSheet();
    var data = sheet ? sheet.getDataRange().getValues() : [];
    
    if (!data || data.length <= 1) {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var testData = allSheets[s].getDataRange().getValues();
        if (testData && testData.length > (data ? data.length : 0)) {
          sheet = allSheets[s];
          data = testData;
        }
      }
    }
    
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetName: sheet ? sheet.getName() : "Trang tính",
        data: [],
        raw: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Tự động tìm hàng tiêu đề thông minh trong 10 hàng đầu tiên
    var headerRowIdx = -1;
    for (var r = 0; r < Math.min(data.length, 10); r++) {
      var rowStr = data[r].map(function(c) { return String(c || "").toLowerCase(); }).join(" ");
      var cleanStr = rowStr
        .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
        .replace(/đ/g, "d").replace(/[^a-z0-9 ]/g, " ");
      
      if (
        cleanStr.indexOf("ho so") !== -1 ||
        cleanStr.indexOf("quy trinh") !== -1 ||
        cleanStr.indexOf("thu tuc") !== -1 ||
        cleanStr.indexOf("han tra") !== -1 ||
        cleanStr.indexOf("ngay hen") !== -1 ||
        cleanStr.indexOf("tiep nhan") !== -1 ||
        cleanStr.indexOf("ngay nhan") !== -1
      ) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;
    
    var headers = data[headerRowIdx].map(function(h) { return String(h || "").trim(); });
    var records = [];
    var timeZone = Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh";
    
    // 3. Trích xuất dữ liệu, an toàn tuyệt đối với mọi kiểu dữ liệu (ngày giờ, số, chữ, rỗng)
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      var row = data[i];
      if (!row) continue;
      
      // Bỏ qua các hàng hoàn toàn rỗng
      var hasValue = false;
      for (var c = 0; c < row.length; c++) {
        if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
          hasValue = true;
          break;
        }
      }
      if (!hasValue) continue;
      
      var record = { rowIndex: i + 1 };
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        if (!header) continue;
        var val = row[j];
        
        if (val instanceof Date) {
          try {
            if (!isNaN(val.getTime())) {
              var hours = val.getHours();
              var mins = val.getMinutes();
              if (hours !== 0 || mins !== 0) {
                record[header] = Utilities.formatDate(val, timeZone, "dd/MM/yyyy HH:mm");
              } else {
                record[header] = Utilities.formatDate(val, timeZone, "dd/MM/yyyy");
              }
            } else {
              record[header] = "";
            }
          } catch (eDate) {
            record[header] = String(val || "");
          }
        } else {
          record[header] = (val != null) ? String(val).trim() : "";
        }
      }
      records.push(record);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      sheetName: sheet.getName(),
      total: records.length,
      data: records,
      raw: data,
      headerRowIdx: headerRowIdx
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    function clean(str) {
      return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    
    var colIndex = -1;
    for (var r = 0; r < Math.min(data.length, 10); r++) {
      for (var c = 0; c < data[r].length; c++) {
        var h = clean(data[r][c]);
        if (h.indexOf("trathucte") !== -1 || h.indexOf("thucte") !== -1) {
          colIndex = c + 1;
          break;
        }
      }
      if (colIndex !== -1) break;
    }
    if (colIndex === -1) {
      colIndex = sheet.getLastColumn() + 1;
      sheet.getRange(1, colIndex).setValue("Trả thực tế");
    }
    
    // Hỗ trợ xử lý tích chọn hàng loạt nhiều hồ sơ cùng lúc
    if (contents.action === "markMultipleComplete" && Array.isArray(contents.rowIndices)) {
      var ts = contents.timestamp || "";
      for (var k = 0; k < contents.rowIndices.length; k++) {
        sheet.getRange(contents.rowIndices[k], colIndex).setValue(ts);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: contents.rowIndices.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rowIndex = contents.rowIndex;
    var timestamp = contents.timestamp;
    sheet.getRange(rowIndex, colIndex).setValue(timestamp);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
};
`;

