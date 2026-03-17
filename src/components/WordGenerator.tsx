import React, { useState, useRef, useMemo } from 'react';
import { FileText, Download, Loader2, LayoutTemplate, UploadCloud, X, List, Languages } from 'lucide-react';
import { generateWordContent, translateWordContent } from '../services/ai';
import { processReferenceFile } from '../utils/fileParser';
import RichTextEditor from './RichTextEditor';
import { generateDocxFromTiptap } from '../utils/tiptapToDocx';
import { marked } from 'marked';

type TemplateId = 'standard' | 'professional' | 'modern' | 'academic';

interface TemplateConfig {
  id: TemplateId;
  name: string;
  font: string;
  size: number; // half-points (e.g., 24 = 12pt)
  lineSpacing: number; // 240 = 1.0, 360 = 1.5, 480 = 2.0
  colorClass: string;
  previewFont: string;
}

const TEMPLATES: TemplateConfig[] = [
  { id: 'standard', name: 'Standard', font: 'Calibri', size: 22, lineSpacing: 276, colorClass: 'bg-blue-500', previewFont: 'font-sans' },
  { id: 'professional', name: 'Professional', font: 'Times New Roman', size: 24, lineSpacing: 360, colorClass: 'bg-slate-800', previewFont: 'font-serif' },
  { id: 'modern', name: 'Modern', font: 'Arial', size: 22, lineSpacing: 360, colorClass: 'bg-teal-500', previewFont: 'font-sans tracking-wide' },
  { id: 'academic', name: 'Academic', font: 'Georgia', size: 24, lineSpacing: 480, colorClass: 'bg-indigo-600', previewFont: 'font-serif' },
];

const DOCUMENT_TYPES = {
  official_documents: [
    {
      type: "Surat Dinas",
      description: "Korespondensi formal antar instansi dengan kop surat dan nomor surat.",
      common_elements: ["Kop Surat", "Nomor Surat", "Tanda Tangan", "Stempel"]
    },
    {
      type: "Laporan Tahunan",
      description: "Dokumen komprehensif mengenai aktivitas perusahaan dalam satu tahun.",
      common_elements: ["Daftar Isi", "Grafik", "Analisis Data"]
    },
    {
      type: "Proposal Bisnis",
      description: "Dokumen penawaran proyek atau kerjasama kepada pihak eksternal.",
      common_elements: ["Executive Summary", "Anggaran", "Timeline"]
    },
    {
      type: "Kontrak Kerja",
      description: "Perjanjian legal antara dua pihak atau lebih.",
      common_elements: ["Pasal-Pasal", "Materai", "Identitas Pihak"]
    }
  ],
  unofficial_documents: [
    {
      type: "Resume / CV",
      description: "Ringkasan pengalaman kerja dan keahlian pribadi.",
      common_elements: ["Foto", "Skill Bar", "Riwayat Pendidikan"]
    },
    {
      type: "Undangan Acara",
      description: "Pemberitahuan informal untuk acara sosial atau keluarga.",
      common_elements: ["Font Dekoratif", "Gambar", "Alamat Lokasi"]
    },
    {
      type: "Memo Internal",
      description: "Pesan singkat antar departemen dalam satu kantor.",
      common_elements: ["To/From Section", "Poin Utama"]
    },
    {
      type: "Catatan Harian",
      description: "Dokumen pribadi untuk dokumentasi aktivitas atau ide.",
      common_elements: ["Tanggal", "List Bullet"]
    }
  ]
};

export default function WordGenerator({ language }: { language: string }) {
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [jsonContent, setJsonContent] = useState<any>(null);
  const [outline, setOutline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('standard');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [wordCount, setWordCount] = useState<number>(500);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

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
      
      const text = await generateWordContent(prompt, language, referenceData, wordCount, selectedDocType);
      const html = await marked.parse(text || '');
      setContent(html);
    } catch (error) {
      console.error(error);
      alert('Failed to generate content. Make sure the reference file is supported (PDF, Image, TXT, CSV, DOCX, XLSX).');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!content) return;
    setTranslating(true);
    try {
      const translatedHtml = await translateWordContent(content, targetLanguage);
      setContent(translatedHtml);
    } catch (error) {
      console.error(error);
      alert('Failed to translate document.');
    } finally {
      setTranslating(false);
    }
  };

  const handleOutlineClick = (lineIndex: number) => {
    // Tiptap doesn't have a simple line index scroll, but we can scroll to the heading element
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const targetHeading = headings[lineIndex];
      if (targetHeading) {
        targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleDownload = async () => {
    const currentJson = editorRef.current?.getJSON() || jsonContent;
    if (!content || !currentJson) return;
    try {
      const tpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

      // Determine file name from document title or prompt
      let fileName = prompt || 'Generated_Document';
      if (outline.length > 0 && outline[0].text) {
        fileName = outline[0].text;
      }
      // Sanitize file name (keep spaces and alphanumeric)
      fileName = fileName.replace(/[^a-zA-Z0-9 -]/g, '').trim().substring(0, 100) || 'Generated_Document';

      const blob = await generateDocxFromTiptap(currentJson, tpl, fileName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Failed to download document');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="text-blue-600" />
          Word Document Generator
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" /> Choose a Template
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  selectedTemplate === tpl.id 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full ${tpl.colorClass} shadow-sm shrink-0`}></div>
                <span className="font-medium text-slate-700 text-sm">{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should the document be about?"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Words:</label>
              <input
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                className="w-20 bg-transparent outline-none text-slate-800 font-medium"
                min="50"
                step="50"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Generate'}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">General Document</option>
              <optgroup label="Official Documents">
                {DOCUMENT_TYPES.official_documents.map(doc => (
                  <option key={doc.type} value={doc.type}>{doc.type}</option>
                ))}
              </optgroup>
              <optgroup label="Unofficial Documents">
                {DOCUMENT_TYPES.unofficial_documents.map(doc => (
                  <option key={doc.type} value={doc.type}>{doc.type}</option>
                ))}
              </optgroup>
            </select>

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

      {content && (
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Outline Sidebar */}
          <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-y-auto flex flex-col">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <List className="w-4 h-4 text-blue-500" />
              Document Outline
            </h3>
            {outline.length > 0 ? (
              <div className="space-y-1">
                {outline.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOutlineClick(item.lineIndex)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors truncate ${
                      item.level === 1 ? 'font-semibold text-slate-800' :
                      item.level === 2 ? 'pl-6 text-slate-600' :
                      'pl-9 text-slate-500 text-xs'
                    }`}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No headings found.</p>
            )}
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-slate-800">Preview & Edit</h3>
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
                    className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-1"
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
                Download .docx
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <RichTextEditor
                content={content}
                onChange={(html, json) => {
                  setContent(html);
                  setJsonContent(json);
                }}
                onOutlineChange={setOutline}
                editorRef={editorRef}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
