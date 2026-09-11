export interface SheetRecord {
  rowIndex: number; // to know which row to update
  stt: string;
  soHoSo: string;
  quyTrinh: string;
  tenDonVi: string;
  coQuanXuLy: string;
  canBoXuLy: string;
  ngayNhan: string;
  ngayTra: string;
  traThucTe: string;
}

// Remove default SHEET_ID and replace it with Web App URL
export const WEB_APP_URL_DEFAULT = ''; // User will enter their Apps Script URL

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

    // Apps Script now returns the records directly structured
    const records: SheetRecord[] = data.data || [];

    return { records, sheetName: 'Sheet dữ liệu' }; // Web App abstracts the sheet name
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
            'Content-Type': 'text/plain;charset=utf-8', // Important for Apps Script POST
        },
        body: JSON.stringify({
            rowIndex: rowIndex,
            timestamp: timestampStr
        })
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
