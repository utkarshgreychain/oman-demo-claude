export async function parseExcel(buffer: Buffer, filename: string, ext: string): Promise<string> {
  const XLSX = await import('xlsx');
  let workbook: any;

  if (ext === 'csv' || ext === 'tsv') {
    const text = buffer.toString('utf-8');
    workbook = XLSX.read(text, { type: 'string', raw: true });
  } else {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  }

  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (workbook.SheetNames.length > 1) {
      parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    } else {
      parts.push(csv);
    }
  }

  return parts.join('\n\n');
}
