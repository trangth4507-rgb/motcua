export interface SheetRecord {
  rowIndex: number; // to know which row to update
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

// Helper to normalize any incoming item from Google Apps Script
export function normalizeRecord(raw: any, index: number): SheetRecord {
  if (!raw || typeof raw !== 'object') {
    return {
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
  }

  // If raw is an array of cell values
  if (Array.isArray(raw)) {
    return {
      rowIndex: index + 2,
      stt: String(raw[0] ?? index + 1).trim(),
      soHoSo: String(raw[1] ?? '').trim(),
      quyTrinh: String(raw[2] ?? '').trim(),
      boPhanHienTai: String(raw[3] ?? '').trim(),
      menuHienTai: String(raw[4] ?? '').trim(),
      tenDonVi: String(raw[5] ?? '').trim(),
      coQuanXuLy: String(raw[6] ?? '').trim(),
      canBoXuLy: String(raw[7] ?? '').trim(),
      ngayNhan: String(raw[8] ?? '').trim(),
      ngayTra: String(raw[9] ?? '').trim(),
      traThucTe: String(raw[10] ?? '').trim(),
    };
  }

  // Flexible key finder (case-insensitive & accent-friendly matching)
  const getVal = (possibleKeys: string[]): string => {
    // 1. Direct match
    for (const key of possibleKeys) {
      if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
        return String(raw[key]).trim();
      }
    }
    // 2. Case-insensitive / whitespace-stripped match
    const simplifiedTargets = possibleKeys.map((k) =>
      k.toLowerCase().replace(/[\s_\-\/]/g, '')
    );
    for (const rawKey of Object.keys(raw)) {
      const cleanRawKey = rawKey.toLowerCase().replace(/[\s_\-\/]/g, '');
      if (simplifiedTargets.includes(cleanRawKey)) {
        const val = raw[rawKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
    return '';
  };

  const boPhan = getVal([
    'BỘ PHẬN HIỆN TẠI',
    'Bộ phận hiện tại',
    'Bộ Phận Hiện Tại',
    'boPhanHienTai',
    'bo_phan_hien_tai',
    'BỘ PHẬN',
    'Bộ phận',
    'boPhan',
    'Phòng ban',
    'phongBan',
  ]);

  const menu = getVal([
    'MENU HIỆN TẠI',
    'Menu hiện tại',
    'Menu Hiện Tại',
    'menuHienTai',
    'menu_hien_tai',
    'MENU',
    'Menu',
    'menu',
    'Trạng thái xử lý',
    'Bước xử lý',
    'trangThaiXuLy',
  ]);

  return {
    rowIndex: Number(raw.rowIndex) || (index + 2),
    stt: getVal(['STT', 'stt', 'Số TT', 'Số thứ tự']) || String(index + 1),
    soHoSo: getVal(['soHoSo', 'SỐ HỒ SƠ', 'Số hồ sơ', 'Số Hồ Sơ', 'Mã hồ sơ', 'maHoSo']),
    quyTrinh: getVal(['quyTrinh', 'QUY TRÌNH', 'Quy trình', 'Tên quy trình', 'Tên thủ tục', 'thuTuc']),
    boPhanHienTai: boPhan,
    menuHienTai: menu,
    tenDonVi: getVal(['tenDonVi', 'TÊN ĐƠN VỊ / HỌ TÊN', 'Tên đơn vị / Họ tên', 'Tên đơn vị', 'Họ tên', 'Chủ hồ sơ', 'Người nộp']),
    coQuanXuLy: getVal(['coQuanXuLy', 'CƠ QUAN XỬ LÝ', 'Cơ quan xử lý', 'Cơ quan', 'Đơn vị xử lý']),
    canBoXuLy: getVal(['canBoXuLy', 'CÁN BỘ XỬ LÝ', 'Cán bộ xử lý', 'Cán bộ', 'Người xử lý']),
    ngayNhan: getVal(['ngayNhan', 'NGÀY NHẬN', 'Ngày nhận', 'Ngày tiếp nhận']),
    ngayTra: getVal(['ngayTra', 'HẠN TRẢ', 'Hạn trả', 'NGÀY TRẢ', 'Ngày trả', 'Hạn trả kết quả']),
    traThucTe: getVal(['traThucTe', 'TRẢ THỰC TẾ', 'Trả thực tế', 'Ngày trả thực tế']),
  };
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

    const rawList: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : [];

    const records: SheetRecord[] = rawList.map((item, idx) => normalizeRecord(item, idx));

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

export const SAMPLE_APPS_SCRIPT_CODE = `// Mã Google Apps Script đồng bộ 2 chiều với ứng dụng Deadline
// Hỗ trợ hiển thị đầy đủ: STT, Số hồ sơ, Quy trình, Bộ phận hiện tại, Menu hiện tại,...

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var records = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Bỏ qua dòng trống
      if (!row.some(function(cell) { return cell !== '' && cell !== null; })) continue;
      
      var record = { rowIndex: i + 1 };
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var val = row[j];
        if (val instanceof Date) {
          record[header] = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
        } else {
          record[header] = val != null ? String(val) : '';
        }
      }
      records.push(record);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      sheetName: sheet.getName(),
      data: records 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var rowIndex = contents.rowIndex;
    var timestamp = contents.timestamp;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Tự động tìm vị trí cột TRẢ THỰC TẾ
    var colIndex = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]).toUpperCase().trim();
      if (h === 'TRẢ THỰC TẾ' || h === 'NGÀY TRẢ THỰC TẾ') {
        colIndex = c + 1;
        break;
      }
    }
    if (colIndex === -1) {
      colIndex = headers.length; // Mặc định cột cuối nếu không tìm thấy
    }
    
    sheet.getRange(rowIndex, colIndex).setValue(timestamp);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
