const SPREADSHEET_ID = '10d8T0fqzQRFxcoOdKKhqLpNLn10Q0NMGF2aC2AoArNE';
const SHEET_NAMES = ['Customers', 'Deliveries', 'Payments', 'Expenses', 'MissingCans', 'Settings', 'Dashboard', 'Reports'];
const ID_FIELD = 'id';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  const params = parseRequest(e);
  const sheetName = params.sheet;
  const action = params.action;

  if (!sheetName || !action) {
    return jsonResponse({ success: false, error: 'Missing sheet or action' }, 400);
  }

  if (!SHEET_NAMES.includes(sheetName)) {
    return jsonResponse({ success: false, error: `Unknown sheet: ${sheetName}` }, 400);
  }

  try {
    let result;
    switch (action) {
      case 'read':
        result = readSheet(sheetName);
        break;
      case 'create':
        result = createRecord(sheetName, params.payload);
        break;
      case 'update':
        result = updateRecord(sheetName, params.payload);
        break;
      case 'delete':
        result = deleteRecord(sheetName, params.payload?.id);
        break;
      default:
        return jsonResponse({ success: false, error: `Unsupported action: ${action}` }, 400);
    }
    return jsonResponse({ success: true, data: result });
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
}

function parseRequest(e) {
  const params = {};
  if (e.postData && e.postData.type === 'application/json') {
    try {
      Object.assign(params, JSON.parse(e.postData.contents));
    } catch (err) {
      // ignore JSON parse errors and fallback to query params
    }
  }
  Object.assign(params, e.parameter);
  if (params.payload && typeof params.payload === 'string') {
    try {
      params.payload = JSON.parse(params.payload);
    } catch (err) {
      // keep as string if not JSON
    }
  }
  return params;
}

function jsonResponse(body, status) {
  const output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);
  if (status) {
    output.setContent(JSON.stringify({ ...body, status }));
  }
  return output;
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) {
    throw `Missing sheet: ${sheetName}`;
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    return { headers: [], rows: [] };
  }
  const headers = values[0].map(String);
  const rows = values.slice(1);
  return { headers, rows, sheet };
}

function readSheet(sheetName) {
  const { headers, rows } = getSheetData(sheetName);
  return rows.map((row) => rowToRecord(headers, row));
}

function createRecord(sheetName, payload) {
  if (!payload) {
    throw 'Missing payload for create';
  }
  const { headers, sheet } = getSheetData(sheetName);
  const record = normalizeRecord(headers, payload, true);
  const existing = readSheet(sheetName).find((item) => item[ID_FIELD] === record[ID_FIELD]);
  if (existing) {
    throw `Duplicate record id: ${record[ID_FIELD]}`;
  }
  const row = headers.map((header) => record[header] ?? '');
  sheet.appendRow(row);
  return record;
}

function updateRecord(sheetName, payload) {
  if (!payload) {
    throw 'Missing payload for update';
  }
  const { headers, rows, sheet } = getSheetData(sheetName);
  const record = normalizeRecord(headers, payload, false);
  const idIndex = headers.indexOf(ID_FIELD);
  if (idIndex === -1) {
    throw `Missing ${ID_FIELD} column in ${sheetName}`;
  }
  const rowIndex = rows.findIndex((row) => String(row[idIndex]) === String(record[ID_FIELD]));
  if (rowIndex === -1) {
    throw `Record not found: ${record[ID_FIELD]}`;
  }
  const outputRow = headers.map((header) => record[header] ?? '');
  sheet.getRange(rowIndex + 2, 1, 1, outputRow.length).setValues([outputRow]);
  return record;
}

function deleteRecord(sheetName, id) {
  if (!id) {
    throw 'Missing id for delete';
  }
  const { headers, rows, sheet } = getSheetData(sheetName);
  const idIndex = headers.indexOf(ID_FIELD);
  if (idIndex === -1) {
    throw `Missing ${ID_FIELD} column in ${sheetName}`;
  }
  const rowIndex = rows.findIndex((row) => String(row[idIndex]) === String(id));
  if (rowIndex === -1) {
    throw `Record not found: ${id}`;
  }
  sheet.deleteRow(rowIndex + 2);
  return { id };
}

function rowToRecord(headers, row) {
  const record = {};
  headers.forEach((header, index) => {
    record[header] = row[index] === '' ? null : row[index];
  });
  return record;
}

function normalizeRecord(headers, payload, requireId) {
  const record = {};
  headers.forEach((header) => {
    if (payload.hasOwnProperty(header)) {
      record[header] = payload[header];
    } else {
      record[header] = null;
    }
  });
  if (requireId && !record[ID_FIELD]) {
    throw `Payload missing required ${ID_FIELD}`;
  }
  return record;
}
