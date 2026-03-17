import React, { useState, useRef } from 'react';
import { Table, Download, Loader2, Bold, Italic, Palette, UploadCloud, X, List, LayoutTemplate, Languages } from 'lucide-react';
import { generateExcelContent, translateExcelContent } from '../services/ai';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { processReferenceFile } from '../utils/fileParser';

interface CellData {
  value: string;
  bold: boolean;
  italic: boolean;
  bgColor: string;
}

export default function ExcelGenerator({ language }: { language: string }) {
  const [prompt, setPrompt] = useState('');
  const [data, setData] = useState<CellData[][]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [includeChart, setIncludeChart] = useState(false);
  const [borderTemplate, setBorderTemplate] = useState<'none' | 'all' | 'outside'>('none');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      let referenceData;
      if (referenceFile) {
        referenceData = await processReferenceFile(referenceFile);
      }
      
      const generatedData: string[][] = await generateExcelContent(prompt, language, referenceData, includeChart);
      const formattedData: CellData[][] = generatedData.map((row, rIndex) =>
        row.map((val) => ({
          value: val,
          bold: rIndex === 0, // Header bold by default
          italic: false,
          bgColor: rIndex === 0 ? '#f1f5f9' : '#ffffff', // Header light gray by default
        }))
      );
      setData(formattedData);
      setSelectedCell(null);
    } catch (error) {
      console.error(error);
      alert('Failed to generate spreadsheet. Make sure the reference file is supported (PDF, Image, TXT, CSV, DOCX, XLSX).');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (data.length === 0) return;
    setTranslating(true);
    try {
      // Extract string data
      const stringData = data.map(row => row.map(cell => cell.value));
      const translatedData = await translateExcelContent(stringData, targetLanguage);
      
      // Merge back with formatting
      const newData = data.map((row, rIdx) => 
        row.map((cell, cIdx) => ({
          ...cell,
          value: translatedData[rIdx]?.[cIdx] || cell.value
        }))
      );
      setData(newData);
    } catch (error) {
      console.error(error);
      alert('Failed to translate spreadsheet.');
    } finally {
      setTranslating(false);
    }
  };

  const handleDownload = async () => {
    if (data.length === 0) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');

      data.forEach((row, rIndex) => {
        row.forEach((cellData, cIndex) => {
          const cell = worksheet.getCell(rIndex + 1, cIndex + 1);
          cell.value = cellData.value;
          cell.font = {
            bold: cellData.bold,
            italic: cellData.italic,
          };
          if (cellData.bgColor && cellData.bgColor !== '#ffffff' && cellData.bgColor !== 'transparent') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: cellData.bgColor.replace('#', '') },
            };
          }

          // Apply borders
          if (borderTemplate === 'all') {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          } else if (borderTemplate === 'outside') {
            cell.border = {
              top: rIndex === 0 ? { style: 'medium' } : undefined,
              bottom: rIndex === data.length - 1 ? { style: 'medium' } : undefined,
              left: cIndex === 0 ? { style: 'medium' } : undefined,
              right: cIndex === row.length - 1 ? { style: 'medium' } : undefined,
            };
          }
        });
      });

      // Auto-fit columns roughly
      worksheet.columns.forEach(column => {
        column.width = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      
      let fileName = prompt || 'Generated_Spreadsheet';
      fileName = fileName.replace(/[^a-zA-Z0-9 -]/g, '').trim().substring(0, 100) || 'Generated_Spreadsheet';
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${fileName}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('Failed to download spreadsheet');
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex][colIndex].value = value;
    setData(newData);
  };

  const toggleFormat = (format: 'bold' | 'italic') => {
    if (!selectedCell) return;
    const newData = [...data];
    newData[selectedCell.r][selectedCell.c][format] = !newData[selectedCell.r][selectedCell.c][format];
    setData(newData);
  };

  const changeBgColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCell) return;
    const newData = [...data];
    newData[selectedCell.r][selectedCell.c].bgColor = e.target.value;
    setData(newData);
  };

  const handleOutlineClick = (colIndex: number) => {
    if (!tableContainerRef.current) return;
    // Scroll to the column
    const thElements = tableContainerRef.current.querySelectorAll('th');
    if (thElements[colIndex]) {
      thElements[colIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setSelectedCell({ r: 0, c: colIndex });
    }
  };

  const currentCellData = selectedCell ? data[selectedCell.r]?.[selectedCell.c] : null;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Table className="text-emerald-600" />
          Excel Spreadsheet Generator
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What kind of data do you need?"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50">
              <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChart}
                  onChange={(e) => setIncludeChart(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                Chart Data
              </label>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Generate'}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 border border-slate-300 text-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Reference File (Optional)
            </button>
            {referenceFile && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="truncate max-w-[200px]">{referenceFile.name}</span>
                <button onClick={() => setReferenceFile(null)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Outline Sidebar */}
          <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-y-auto flex flex-col">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <List className="w-4 h-4 text-emerald-500" />
              Columns Outline
            </h3>
            <div className="space-y-1">
              {data[0]?.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOutlineClick(idx)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors truncate text-slate-700"
                  title={cell.value}
                >
                  <span className="text-emerald-500 font-medium mr-2">{String.fromCharCode(65 + idx)}</span>
                  {cell.value || `Column ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-slate-800">Preview & Edit Data</h3>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Languages className="w-4 h-4 text-slate-500" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                  >
                    <option value="Indonesian">Indonesian</option>
                    <option value="English">English</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Chinese">Chinese</option>
                  </select>
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Translate'}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download .xlsx
              </button>
            </div>
            
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-4 mb-4 p-2 bg-slate-50 rounded-lg border border-slate-200 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFormat('bold')}
                  disabled={!selectedCell}
                  className={`p-2 rounded-md transition-colors ${currentCellData?.bold ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'} disabled:opacity-50`}
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleFormat('italic')}
                  disabled={!selectedCell}
                  className={`p-2 rounded-md transition-colors ${currentCellData?.italic ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'} disabled:opacity-50`}
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <div className="flex items-center gap-2" title="Background Color">
                  <Palette className={`w-4 h-4 ${!selectedCell ? 'text-slate-400' : 'text-slate-600'}`} />
                  <input
                    type="color"
                    value={currentCellData?.bgColor || '#ffffff'}
                    onChange={changeBgColor}
                    disabled={!selectedCell}
                    className="w-8 h-8 rounded cursor-pointer disabled:opacity-50 border-0 p-0"
                  />
                </div>
              </div>

              <div className="w-px h-6 bg-slate-300 mx-2"></div>

              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-slate-500" />
                <select
                  value={borderTemplate}
                  onChange={(e) => setBorderTemplate(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none cursor-pointer"
                >
                  <option value="none">No Borders</option>
                  <option value="all">All Borders</option>
                  <option value="outside">Outside Borders</option>
                </select>
              </div>

              {!selectedCell && <span className="text-xs text-slate-400 ml-auto">Select a cell to format</span>}
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  {data[0]?.map((cellData, colIndex) => (
                    <th 
                      key={colIndex} 
                      className="border-b border-r border-slate-200 p-0 sticky top-0 z-10"
                      style={{ backgroundColor: cellData.bgColor }}
                    >
                      <input
                        type="text"
                        value={cellData.value}
                        onFocus={() => setSelectedCell({ r: 0, c: colIndex })}
                        onChange={(e) => updateCell(0, colIndex, e.target.value)}
                        className={`w-full h-full px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset ${cellData.bold ? 'font-bold' : 'font-normal'} ${cellData.italic ? 'italic' : 'not-italic'}`}
                        style={{ color: '#1e293b' }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex + 1}>
                    {row.map((cellData, colIndex) => {
                      const r = rowIndex + 1;
                      const c = colIndex;
                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                      return (
                        <td 
                          key={colIndex} 
                          className={`border-b border-r border-slate-200 p-0 transition-colors ${isSelected ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}
                          style={{ backgroundColor: cellData.bgColor }}
                        >
                          <input
                            type="text"
                            value={cellData.value}
                            onFocus={() => setSelectedCell({ r, c })}
                            onChange={(e) => updateCell(r, c, e.target.value)}
                            className={`w-full h-full px-4 py-2 bg-transparent outline-none text-sm ${cellData.bold ? 'font-bold' : 'font-normal'} ${cellData.italic ? 'italic' : 'not-italic'}`}
                            style={{ color: '#334155' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
