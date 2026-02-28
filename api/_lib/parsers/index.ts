import { parsePdf } from './pdf';
import { parseDocx } from './docx';
import { parseExcel } from './excel';
import { parseText } from './text';

const EXCEL_EXTS = new Set(['xlsx', 'xls', 'csv', 'tsv']);
const TEXT_EXTS = new Set(['txt', 'md', 'log']);
const CODE_EXTS = new Set([
  'py', 'js', 'ts', 'jsx', 'tsx', 'json', 'yaml', 'yml', 'xml', 'html',
  'css', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'sql', 'toml', 'ini',
  'cfg', 'env', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'dart',
]);

export async function parseFile(buffer: Buffer, filename: string, ext: string): Promise<string> {
  const lowerExt = ext.toLowerCase();

  if (lowerExt === 'pdf') {
    return parsePdf(buffer);
  }
  if (lowerExt === 'docx') {
    return parseDocx(buffer);
  }
  if (EXCEL_EXTS.has(lowerExt)) {
    return parseExcel(buffer, filename, lowerExt);
  }
  if (TEXT_EXTS.has(lowerExt) || CODE_EXTS.has(lowerExt)) {
    return parseText(buffer);
  }

  // Fallback: try as text
  return parseText(buffer);
}
