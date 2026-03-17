import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

export async function processReferenceFile(file: File): Promise<{ base64: string; mimeType: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    let csvContent = '';
    workbook.eachSheet((worksheet) => {
      csvContent += `--- Sheet: ${worksheet.name} ---\n`;
      worksheet.eachRow((row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        csvContent += values.map(v => {
          if (typeof v === 'object' && v !== null) {
            return (v as any).result || (v as any).text || '';
          }
          return v;
        }).join(',') + '\n';
      });
    });
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    return { base64, mimeType: 'text/csv' };
  }
  
  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const base64 = btoa(unescape(encodeURIComponent(result.value)));
    return { base64, mimeType: 'text/plain' };
  }
  
  // For PDF, images, txt, csv, etc., pass directly
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
  
  let mimeType = file.type || 'application/octet-stream';
  if (extension === 'csv') mimeType = 'text/csv';
  else if (extension === 'txt') mimeType = 'text/plain';
  
  return { base64, mimeType };
}
