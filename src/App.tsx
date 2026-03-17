import React, { useState } from 'react';
import { FileText, Presentation, Table, FileType2, Globe2 } from 'lucide-react';
import WordGenerator from './components/WordGenerator';
import PPTGenerator from './components/PPTGenerator';
import ExcelGenerator from './components/ExcelGenerator';
import PDFEditor from './components/PDFEditor';

type AppMode = 'word' | 'ppt' | 'excel' | 'pdf';
type Language = 'Indonesian' | 'English' | 'Arabic';

export default function App() {
  const [mode, setMode] = useState<AppMode>('word');
  const [language, setLanguage] = useState<Language>('Indonesian');

  const renderContent = () => {
    switch (mode) {
      case 'word': return <WordGenerator language={language} />;
      case 'ppt': return <PPTGenerator language={language} />;
      case 'excel': return <ExcelGenerator language={language} />;
      case 'pdf': return <PDFEditor language={language} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            AHIM Office AI
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide uppercase">Smart Suite</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setMode('word')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              mode === 'word' 
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className={`w-5 h-5 ${mode === 'word' ? 'text-blue-600' : 'text-slate-400'}`} />
            Word Generator
          </button>
          
          <button
            onClick={() => setMode('ppt')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              mode === 'ppt' 
                ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Presentation className={`w-5 h-5 ${mode === 'ppt' ? 'text-orange-600' : 'text-slate-400'}`} />
            PPT Generator
          </button>
          
          <button
            onClick={() => setMode('excel')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              mode === 'excel' 
                ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Table className={`w-5 h-5 ${mode === 'excel' ? 'text-emerald-600' : 'text-slate-400'}`} />
            Excel Generator
          </button>
          
          <button
            onClick={() => setMode('pdf')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
              mode === 'pdf' 
                ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileType2 className={`w-5 h-5 ${mode === 'pdf' ? 'text-red-600' : 'text-slate-400'}`} />
            PDF Editor
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-end px-8 z-10 sticky top-0">
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
            <Globe2 className="w-4 h-4 text-slate-500" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="Indonesian">Bahasa Indonesia</option>
              <option value="English">English</option>
              <option value="Arabic">العربية (Arabic)</option>
            </select>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="w-full max-w-[1600px] mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
