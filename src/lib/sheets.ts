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

      if ((k.includes('bophanhientai') || k.includes('bophan') || k.includes('phongban')) && !record.boPhanHienTai) {
        record.boPhanHienTai = val;
      } else if ((k.includes('menuhientai') || k.includes('menu') || k.includes('buocxuly')) && !record.menuHienTai) {
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

export async function fetchSheetData(
  webAppUrl: string
): Promise<{ records: SheetRecord[]; sheetName: string; error?: string }> {
  try {
    if (!webAppUrl) {
      throw new Error("Vui lòng nhập Web App URL của Apps Script");
    }

    const res = await fetch(webAppUrl);
    
    if (!res.ok) {
      throw new Error('Không thể kết nối đến Web App. Vui lòng kiểm tra lại URL.');
    }
    
    const data = await res.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Lỗi từ Apps Script');
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
    }

    // Check if rawList has a header row (for 2D array from sheet.getDataRange().getValues())
    let headerMap: Record<string, number> | undefined;
    let dataRows = rawList;

    if (rawList.length > 0 && Array.isArray(rawList[0])) {
      const firstRowKeys = rawList[0].map((cell: any) => cleanKey(String(cell)));
      const isHeaderRow = firstRowKeys.some((k: string) =>
        ['stt', 'sohoso', 'mahoso', 'quytrinh', 'bophan', 'menu', 'hantra', 'ngaynhan'].some(
          (term) => k.includes(term)
        )
      );

      if (isHeaderRow) {
        headerMap = {};
        firstRowKeys.forEach((k: string, idx: number) => {
          if (k) headerMap![k] = idx;
        });
        dataRows = rawList.slice(1);
      }
    }

    const records: SheetRecord[] = dataRows.map((item, idx) =>
      normalizeRecord(item, idx, headerMap)
    );

    return { records, sheetName: data.sheetName || 'Sheet dữ liệu' };
  } catch (error: any) {
    console.error('fetchSheetData error:', error);
    return { records: [], sheetName: '', error: error.message };
  }
}

export async function markRecordCompleted(
  webAppUrl: string,
  rowIndex: number,
  timestampStr: string
): Promise<boolean> {
  try {
    if (!webAppUrl) {
      throw new Error("Vui lòng nhập Web App URL của Apps Script");
    }

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

    if (!res.ok) {
      throw new Error('Failed to update sheet via Web App');
    }
    
    const data = await res.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Lỗi khi cập nhật từ Apps Script');
    }

    return true;
  } catch (error) {
    console.error('markRecordCompleted error:', error);
    return false;
  }
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

