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

export const SHEET_ID_DEFAULT = '16Tr4_mm6hd0Szzhm2-T91P6QHWJ9lgoY_AQUjZ8ZvLk';

export async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{ records: SheetRecord[]; sheetName: string; error?: string }> {
  try {
    // 1. Get spreadsheet metadata to find the first sheet's name
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!metaRes.ok) {
      const errData = await metaRes.json();
      throw new Error(errData.error?.message || 'Failed to fetch spreadsheet metadata');
    }
    const metaData = await metaRes.json();
    const sheetName = metaData.sheets[0].properties.title;

    // 2. Fetch the data from the first sheet
    const dataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A:U`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!dataRes.ok) {
      const errData = await dataRes.json();
      throw new Error(errData.error?.message || 'Failed to fetch spreadsheet data');
    }
    
    const data = await dataRes.json();
    const rows = data.values || [];
    
    // Skip header row (index 0)
    const records: SheetRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Yellow columns to extract:
      // 2: SỐ HỒ SƠ
      // 3: QUY TRÌNH
      // 5: TÊN ĐƠN VỊ/HỌ TÊN
      // 10: CƠ QUAN XỬ LÝ
      // 11: CÁN BỘ XỬ LÝ
      // 14: NGÀY NHẬN
      // 15: NGÀY TRẢ
      // 16: TRẢ THỰC TẾ
      
      // We only care about rows that have some meaningful data
      if (!row[2] && !row[5]) continue;

      records.push({
        rowIndex: i + 1, // 1-based index for A1 notation
        stt: row[0] || '',
        soHoSo: row[2] || '',
        quyTrinh: row[3] || '',
        tenDonVi: row[5] || '',
        coQuanXuLy: row[10] || '',
        canBoXuLy: row[11] || '',
        ngayNhan: row[14] || '',
        ngayTra: row[15] || '',
        traThucTe: row[16] || '',
      });
    }

    return { records, sheetName };
  } catch (error: any) {
    console.error('fetchSheetData error:', error);
    return { records: [], sheetName: '', error: error.message };
  }
}

// Write the current timestamp to "TRẢ THỰC TẾ" (Column Q)
export async function markRecordCompleted(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  timestampStr: string
): Promise<boolean> {
  try {
    // Column Q is index 16. In A1 notation: Q + rowIndex
    const range = `'${sheetName}'!Q${rowIndex}`;
    
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: [[timestampStr]],
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Failed to update sheet');
    }
    
    return true;
  } catch (error) {
    console.error('markRecordCompleted error:', error);
    return false;
  }
}
