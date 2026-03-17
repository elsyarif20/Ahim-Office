import React, { useState, useRef } from 'react';
import { FileText, Download, Loader2, UploadCloud, Bold, Italic, Languages } from 'lucide-react';
import { extractTextFromImage, translateWordContent } from '../services/ai';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import html2canvas from 'html2canvas';

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function PDFEditor({ language }: { language: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(null);
    editor?.commands.setContent('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      let fullHtml = '';
      
      for (let i = 1; i <= totalPages; i++) {
        setProgress({ current: i, total: totalPages });
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        
        // Get base64 (remove data:image/png;base64,)
        const base64Data = canvas.toDataURL('image/png').split(',')[1];
        
        const htmlText = await extractTextFromImage(base64Data, 'image/png', language);
        fullHtml += htmlText + '<br><br>';
        
        // Update editor incrementally
        editor?.commands.setContent(fullHtml);
      }
      
      setLoading(false);
      setProgress(null);
    } catch (error) {
      console.error(error);
      alert('Failed to extract text from PDF');
      setLoading(false);
      setProgress(null);
    }
  };

  const handleTranslate = async () => {
    if (!editor || editor.isEmpty) return;
    setTranslating(true);
    try {
      const htmlContent = editor.getHTML();
      const translatedHtml = await translateWordContent(htmlContent, targetLanguage);
      editor.commands.setContent(translatedHtml);
    } catch (error) {
      console.error(error);
      alert('Failed to translate document.');
    } finally {
      setTranslating(false);
    }
  };

  const handleDownload = () => {
    if (!editor || !editorRef.current) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      doc.html(editorRef.current, {
        callback: function (doc) {
          let fileName = file ? file.name.replace(/\.pdf$/i, '_Edited') : 'Edited_Document';
          fileName = fileName.replace(/[^a-zA-Z0-9 -_]/g, '').trim().substring(0, 100) || 'Edited_Document';
          doc.save(`${fileName}.pdf`);
        },
        x: 40,
        y: 40,
        width: 515, // A4 width (595) - 80 margins
        windowWidth: 800, // Virtual window width for rendering HTML
        html2canvas: {
          scale: 0.8
        }
      });
    } catch (error) {
      console.error(error);
      alert('Failed to download PDF');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="text-red-600" />
          AI PDF Editor
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Upload a PDF to extract its text using AI. The AI will preserve basic formatting like bold and italics.
        </p>
        <div className="flex gap-4 items-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-2 border border-slate-300"
          >
            <UploadCloud className="w-5 h-5" />
            {file ? file.name : 'Choose PDF File'}
          </button>
          
          <button
            onClick={handleExtract}
            disabled={loading || !file}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Extract Text'}
          </button>
        </div>
        
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Processing page {progress.current} of {progress.total}...</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div 
                className="bg-red-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {editor && !editor.isEmpty && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-medium text-slate-800">Edit Extracted Text</h3>
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
                  className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1"
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
              Save as PDF
            </button>
          </div>
          
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-slate-50">
            <div ref={editorRef} className="bg-white min-h-full">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
