import { getAccessToken } from './googleAuth.js';

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheetTabs: string[];
}

export const ATTENDANCE_SHEET_HEADERS = [
  'Timestamp',
  'Date',
  'Prayer / Event',
  'Hostel Block',
  'Class',
  'Roll No',
  'Student Name',
  'Father Name',
  'Attendance Status',
  'Recorded By',
];

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive.
 */
export async function createGoogleSpreadsheet(
  title: string = 'COSIS Hostels Attendance Log'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; defaultSheetTitle: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in with Google first.');

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Attendance',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create Google Sheet: ${res.statusText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize with header row
  await appendRows(spreadsheetId, 'Attendance', [ATTENDANCE_SHEET_HEADERS]);

  return {
    spreadsheetId,
    spreadsheetUrl,
    defaultSheetTitle: 'Attendance',
  };
}

/**
 * Verifies access to an existing spreadsheet and reads its title and sheets.
 */
export async function verifySpreadsheetAccess(spreadsheetId: string): Promise<SheetMetadata> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in with Google first.');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Cannot access Google Sheet. Please check the Spreadsheet ID / URL and ensure your account has edit access.`
    );
  }

  const data = await res.json();
  const sheetTabs = (data.sheets || []).map((s: any) => s.properties?.title || 'Attendance');

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Google Sheet',
    sheetTabs,
  };
}

/**
 * Appends rows to a spreadsheet tab. Checks if header is needed.
 */
export async function appendRows(
  spreadsheetId: string,
  sheetName: string = 'Attendance',
  rows: (string | number)[][]
): Promise<{ appendedRowsCount: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google. Please sign in with Google first.');

  if (!rows || rows.length === 0) {
    return { appendedRowsCount: 0 };
  }

  // 1. First, check if the sheet already has data or is empty
  try {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}!A1:A2`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const hasValues = checkData.values && checkData.values.length > 0;
      // If the sheet is completely empty and our first row isn't the header, prepend headers
      if (!hasValues && rows[0][0] !== ATTENDANCE_SHEET_HEADERS[0]) {
        rows = [ATTENDANCE_SHEET_HEADERS, ...rows];
      }
    }
  } catch (e) {
    // Continue with append
  }

  // 2. Append rows
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to sync rows to Google Sheets: ${res.statusText}`);
  }

  const data = await res.json();
  const updatedRows = data.updates?.updatedRows || rows.length;

  return {
    appendedRowsCount: updatedRows,
  };
}
