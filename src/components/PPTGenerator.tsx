import React, { useState, useRef } from 'react';
import { Presentation, Download, Loader2, Plus, Trash2, LayoutTemplate, UploadCloud, X, List, ChevronRight, ChevronDown, Languages } from 'lucide-react';
import { generatePPTContent, translatePPTContent } from '../services/ai';
import pptxgen from 'pptxgenjs';
import { processReferenceFile } from '../utils/fileParser';

interface Slide {
  title: string;
  bulletPoints: string[];
}

type TemplateId = 'modern' | 'corporate' | 'minimalist' | 'creative';

interface TemplateConfig {
  id: TemplateId;
  name: string;
  colorClass: string;
  hex: string;
  titleHex: string;
}

const TEMPLATES: TemplateConfig[] = [
  { id: 'modern', name: 'Modern Orange', colorClass: 'bg-orange-600', hex: 'EA580C', titleHex: '1E293B' },
  { id: 'corporate', name: 'Corporate Navy', colorClass: 'bg-blue-900', hex: '1E3A8A', titleHex: 'FFFFFF' },
  { id: 'minimalist', name: 'Minimalist Green', colorClass: 'bg-emerald-600', hex: '059669', titleHex: '059669' },
  { id: 'creative', name: 'Creative Purple', colorClass: 'bg-purple-600', hex: '7C3AED', titleHex: '4C1D95' },
];

const PPT_CATEGORIES = [
  {
    category: "Corporate",
    types: ["Pitch Deck", "Annual Report", "Marketing Plan"]
  },
  {
    category: "Academic",
    types: ["Lecture Material", "Scientific Poster", "Thesis Defense"]
  },
  {
    category: "Creative",
    types: ["Portfolio", "Photo Slideshow", "Event Invitation"]
  }
];

const EXPORT_OPTIONS = ["Editable (PPTX)", "Auto-Play (PPSX)", "Video (MP4)", "Static (PDF)"];

export default function PPTGenerator({ language }: { language: string }) {
  const [prompt, setPrompt] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [slideCount, setSlideCount] = useState<number>(5);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedExportOption, setSelectedExportOption] = useState<string>('Editable (PPTX)');
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set());
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleSlideExpansion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSlides(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

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
      
      const data = await generatePPTContent(prompt, language, referenceData, slideCount, selectedCategory, selectedType);
      setSlides(data);
    } catch (error) {
      console.error(error);
      alert('Failed to generate presentation. Make sure the reference file is supported (PDF, Image, TXT, CSV, DOCX, XLSX).');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (slides.length === 0) return;
    setTranslating(true);
    try {
      const translatedSlides = await translatePPTContent(slides, targetLanguage);
      setSlides(translatedSlides);
    } catch (error) {
      console.error(error);
      alert('Failed to translate presentation.');
    } finally {
      setTranslating(false);
    }
  };

  const handleOutlineClick = (index: number) => {
    slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    if (slides.length === 0) return;
    
    if (selectedExportOption !== 'Editable (PPTX)') {
      alert(`Exporting to ${selectedExportOption} is currently not supported in the browser environment. Exporting as PPTX instead.`);
    }

    try {
      let pres = new pptxgen();
      const tpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

      slides.forEach(slideData => {
        let slide = pres.addSlide();
        
        if (tpl.id === 'modern') {
          // Modern Border Background
          slide.addShape(pres.ShapeType.rect, { 
            x: '4%', y: '6%', w: '92%', h: '88%', 
            line: { color: 'E2E8F0', width: 2 }, 
            fill: { color: 'FFFFFF' } 
          });
          // Top Accent Line
          slide.addShape(pres.ShapeType.rect, { x: '4%', y: '6%', w: '92%', h: '2%', fill: { color: tpl.hex } });
          // Left Accent Line
          slide.addShape(pres.ShapeType.rect, { x: '4%', y: '6%', w: '1.5%', h: '88%', fill: { color: tpl.hex } });
          
          slide.addText(slideData.title, { x: '8%', y: '12%', w: '84%', h: '15%', fontSize: 32, bold: true, color: tpl.titleHex, valign: 'middle' });
          let bulletText = slideData.bulletPoints.map((bp: string) => ({ text: bp, options: { bullet: true } }));
          slide.addText(bulletText, { x: '8%', y: '30%', w: '84%', h: '55%', fontSize: 20, color: '475569', valign: 'top', lineSpacing: 32 });
        
        } else if (tpl.id === 'corporate') {
          // Corporate Header
          slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '18%', fill: { color: tpl.hex } });
          slide.addText(slideData.title, { x: '5%', y: '2%', w: '90%', h: '14%', fontSize: 36, bold: true, color: tpl.titleHex, valign: 'middle' });
          let bulletText = slideData.bulletPoints.map((bp: string) => ({ text: bp, options: { bullet: true } }));
          slide.addText(bulletText, { x: '5%', y: '25%', w: '90%', h: '65%', fontSize: 22, color: '333333', valign: 'top', lineSpacing: 32 });
        
        } else if (tpl.id === 'minimalist') {
          // Minimalist Bottom Accent
          slide.addShape(pres.ShapeType.rect, { x: '5%', y: '90%', w: '90%', h: '0.5%', fill: { color: tpl.hex } });
          slide.addText(slideData.title, { x: '5%', y: '8%', w: '90%', h: '15%', fontSize: 38, bold: true, color: tpl.titleHex, valign: 'middle' });
          let bulletText = slideData.bulletPoints.map((bp: string) => ({ text: bp, options: { bullet: true } }));
          slide.addText(bulletText, { x: '5%', y: '28%', w: '90%', h: '55%', fontSize: 20, color: '444444', valign: 'top', lineSpacing: 36 });
        
        } else if (tpl.id === 'creative') {
          // Creative Left Bar
          slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '4%', h: '100%', fill: { color: tpl.hex } });
          slide.addShape(pres.ShapeType.rect, { x: '4%', y: '15%', w: '40%', h: '0.5%', fill: { color: tpl.hex } });
          slide.addText(slideData.title, { x: '8%', y: '5%', w: '85%', h: '15%', fontSize: 34, bold: true, color: tpl.titleHex, valign: 'middle' });
          let bulletText = slideData.bulletPoints.map((bp: string) => ({ text: bp, options: { bullet: true } }));
          slide.addText(bulletText, { x: '8%', y: '25%', w: '85%', h: '65%', fontSize: 21, color: '333333', valign: 'top', lineSpacing: 32 });
        }
      });
      
      let fileName = prompt || 'Generated_Presentation';
      fileName = fileName.replace(/[^a-zA-Z0-9 -]/g, '').trim().substring(0, 100) || 'Generated_Presentation';
      
      await pres.writeFile({ fileName: `${fileName}.pptx` });
    } catch (error) {
      console.error(error);
      alert('Failed to download presentation');
    }
  };

  const updateSlideTitle = (index: number, title: string) => {
    const newSlides = [...slides];
    newSlides[index].title = title;
    setSlides(newSlides);
  };

  const updateBulletPoint = (slideIndex: number, bulletIndex: number, text: string) => {
    const newSlides = [...slides];
    newSlides[slideIndex].bulletPoints[bulletIndex] = text;
    setSlides(newSlides);
  };

  const addBulletPoint = (slideIndex: number) => {
    const newSlides = [...slides];
    newSlides[slideIndex].bulletPoints.push('');
    setSlides(newSlides);
  };

  const removeBulletPoint = (slideIndex: number, bulletIndex: number) => {
    const newSlides = [...slides];
    newSlides[slideIndex].bulletPoints.splice(bulletIndex, 1);
    setSlides(newSlides);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Presentation className="text-orange-600" />
          PowerPoint Generator
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

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedType('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="">Any Category</option>
              {PPT_CATEGORIES.map(cat => (
                <option key={cat.category} value={cat.category}>{cat.category}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              disabled={!selectedCategory}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Any Type</option>
              {selectedCategory && PPT_CATEGORIES.find(c => c.category === selectedCategory)?.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should the presentation be about?"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-slate-50">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Slides:</label>
              <input
                type="number"
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value) || 0)}
                className="w-16 bg-transparent outline-none text-slate-800 font-medium"
                min="1"
                max="20"
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

      {slides.length > 0 && (
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Outline Sidebar */}
          <div className="w-64 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-y-auto flex flex-col">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <List className="w-4 h-4 text-orange-500" />
              Slide Outline
            </h3>
            <div className="space-y-1">
              {slides.map((slide, idx) => {
                const isExpanded = expandedSlides.has(idx);
                return (
                  <div key={idx} className="flex flex-col">
                    <button
                      onClick={() => handleOutlineClick(idx)}
                      className="w-full flex items-center px-3 py-2 rounded-lg text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors text-slate-700"
                      title={slide.title}
                    >
                      <button 
                        onClick={(e) => toggleSlideExpansion(idx, e)}
                        className="p-0.5 hover:bg-orange-200 rounded mr-1 text-slate-400 hover:text-orange-600 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-orange-500 font-medium mr-2 shrink-0">{idx + 1}.</span>
                      <span className="truncate">{slide.title || 'Untitled Slide'}</span>
                    </button>
                    {isExpanded && slide.bulletPoints && slide.bulletPoints.length > 0 && (
                      <div className="pl-10 pr-3 py-1 space-y-1">
                        {slide.bulletPoints.map((bp, bpIdx) => (
                          <div key={bpIdx} className="text-xs text-slate-500 truncate flex items-start gap-1.5" title={bp}>
                            <span className="text-orange-400 mt-1">•</span>
                            <span className="truncate">{bp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-slate-800">Preview & Edit Slides</h3>
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
                    className="ml-2 px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Translate'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedExportOption}
                  onChange={(e) => setSelectedExportOption(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white text-sm text-slate-700"
                >
                  {EXPORT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-4">
              {slides.map((slide, slideIndex) => {
                const tpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];
                
                let containerClass = "relative p-8 rounded-xl bg-white overflow-hidden ";
                let decorations = null;

                if (tpl.id === 'modern') {
                  containerClass += "border-2 border-slate-200 shadow-sm";
                  decorations = (
                    <>
                      <div className="absolute top-0 left-0 w-full h-2 bg-orange-600"></div>
                      <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
                    </>
                  );
                } else if (tpl.id === 'corporate') {
                  containerClass += "border border-slate-200 shadow-md";
                  decorations = <div className="absolute top-0 left-0 w-full h-4 bg-blue-900"></div>;
                } else if (tpl.id === 'minimalist') {
                  containerClass += "border-b-4 border-emerald-600 shadow-sm";
                } else if (tpl.id === 'creative') {
                  containerClass += "border-l-8 border-purple-600 shadow-sm";
                }

                return (
                  <div 
                    key={slideIndex} 
                    className={containerClass}
                    ref={(el) => { slideRefs.current[slideIndex] = el; }}
                  >
                  {decorations}
                  
                  <div className={tpl.id === 'corporate' ? 'pt-2' : ''}>
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Slide {slideIndex + 1} Title</label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => updateSlideTitle(slideIndex, e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-2xl bg-slate-50 ${
                          tpl.id === 'corporate' ? 'text-blue-900' : 
                          tpl.id === 'minimalist' ? 'text-emerald-700' : 
                          tpl.id === 'creative' ? 'text-purple-800' : 'text-slate-800'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Bullet Points</label>
                        <button onClick={() => addBulletPoint(slideIndex)} className="text-blue-600 hover:text-blue-700 p-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1 text-sm font-medium">
                          <Plus className="w-4 h-4" /> Add Point
                        </button>
                      </div>
                      <div className="space-y-3">
                        {slide.bulletPoints.map((point, bulletIndex) => (
                          <div key={bulletIndex} className="flex gap-3 items-start group">
                            <div className={`mt-4 w-2 h-2 rounded-full shrink-0 ${
                              tpl.id === 'modern' ? 'bg-orange-500' :
                              tpl.id === 'corporate' ? 'bg-blue-800' :
                              tpl.id === 'minimalist' ? 'bg-emerald-500' :
                              'bg-purple-500'
                            }`}></div>
                            <textarea
                              value={point}
                              onChange={(e) => updateBulletPoint(slideIndex, bulletIndex, e.target.value)}
                              className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base text-slate-600 bg-slate-50"
                              rows={2}
                            />
                            <button 
                              onClick={() => removeBulletPoint(slideIndex, bulletIndex)}
                              className="mt-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
