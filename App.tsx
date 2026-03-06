import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { ViewState, CountryCode, DesignCodeFile, ChatMessage, CountryRecord } from './types';
import { COUNTRIES as INITIAL_COUNTRIES } from './constants';
import { extractTextFromPdf } from './services/pdfService';
import { askAboutPdf, globalAiSearch } from './services/geminiService';
import { 
  getAllFilesFromDB, 
  saveFileToDB, 
  deleteFileFromDB, 
  getAllFoldersFromDB, 
  saveFolderToDB, 
  deleteFolderFromDB, 
  getAllCountriesFromDB,
  saveCountryToDB,
  deleteCountryFromDB,
  onDataUpdate,
  FolderRecord 
} from './services/dbService';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Search, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft, 
  MessageSquare, 
  Loader2,
  Trash2,
  Send,
  Sparkles,
  ClipboardCheck,
  ArrowDown,
  Layout,
  Maximize2,
  LayoutGrid,
  List,
  ChevronDown,
  Home,
  FileUp,
  MapPin,
  Link,
  Folder,
  FolderOpen,
  FolderPlus,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  AlertTriangle,
  Plus
} from 'lucide-react';

// Initialize react-pdf worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const LOGO_URL = "https://keoic-my.sharepoint.com/personal/ramy_atya_insiteinternational_com/Documents/00-KEO/00-Logo/InSite_01%20Logo_White.png";

const PALETTE_COLORS = [
  { name: 'Emerald', class: 'bg-emerald-600' },
  { name: 'Red', class: 'bg-red-600' },
  { name: 'Rose', class: 'bg-rose-900' },
  { name: 'Ocean', class: 'bg-blue-600' },
  { name: 'Black', class: 'bg-slate-900' },
  { name: 'Amber', class: 'bg-amber-500' },
  { name: 'Indigo', class: 'bg-indigo-600' },
  { name: 'Teal', class: 'bg-teal-600' },
  { name: 'Violet', class: 'bg-violet-600' },
  { name: 'Slate', class: 'bg-slate-500' },
];

const InSiteLogo = ({ className = "w-10 h-10", rounded = "rounded-xl" }: { className?: string, rounded?: string }) => (
  <img 
    src={LOGO_URL} 
    alt="InSite Logo" 
    className={`${className} ${rounded} object-contain transition-all`}
    onError={(e) => {
      e.currentTarget.style.opacity = '0.5';
    }}
  />
);

const Signature = ({ view }: { view: ViewState }) => {
  if (view !== 'WELCOME') return null;
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-[200] pointer-events-none animate-in fade-in duration-1000">
      <p style={{ fontFamily: 'Arial, sans-serif', color: '#8ED96C' }} className="text-[9px] font-bold uppercase mb-0.5 whitespace-nowrap tracking-[0.2em]">Developed By InSite R&D Team</p>
      <p style={{ fontFamily: 'Arial, sans-serif', color: '#8ED96C' }} className="text-[9px] font-bold uppercase whitespace-nowrap tracking-[0.2em]">Digital Studio</p>
    </div>
  );
};

const AuditSearchBar = memo(({ onSearch, isThinking }: { onSearch: (q: string) => void, isThinking: boolean }) => {
  const [localVal, setLocalVal] = useState('');
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localVal.trim() || isThinking) return;
    onSearch(localVal);
    setLocalVal('');
  };

  return (
    <div className="bg-white rounded-[3.5rem] p-12 mb-8 border border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)]">
       <div className="flex items-center gap-4 mb-10">
          <Sparkles size={24} className="text-slate-900" />
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Directory Audit AI</h3>
       </div>
       <form onSubmit={handleFormSubmit} className="flex gap-6">
          <div className="flex-1 relative">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
            <input 
              type="text" 
              value={localVal} 
              onChange={(e) => setLocalVal(e.target.value)}
              placeholder="Ask about technical info in this archive..." 
              className="w-full bg-[#f8f9fc] border border-slate-100 rounded-[2.5rem] pl-16 pr-8 py-7 text-[15px] font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:text-slate-200"
            />
          </div>
          <button type="submit" disabled={!localVal.trim() || isThinking} className="bg-[#8a8f9c] text-white px-12 py-7 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-slate-900 transition-all shadow-xl disabled:opacity-50 flex items-center gap-3">
            {isThinking ? <Loader2 size={16} className="animate-spin" /> : null}
            Audit Directory
          </button>
       </form>
    </div>
  );
});

const FolderNameInput = ({ value, onChange, onConfirm, onCancel, placeholder = "Enter directory name..." }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <input 
      ref={inputRef} 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { 
        if (e.key === 'Enter') onConfirm(value); 
        if (e.key === 'Escape') onCancel(); 
      }}
      placeholder={placeholder} 
      className="w-full bg-white border-2 border-blue-500 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-50 shadow-sm transition-all"
    />
  );
};

const NewFolderRow = ({ onConfirm, onCancel }: { onConfirm: (name: string) => void, onCancel: () => void }) => {
  const [name, setName] = useState('');
  return (
    <div className="flex gap-4 p-6 bg-blue-50/50 rounded-3xl animate-in slide-in-from-top-2 border border-blue-100 items-center mb-6">
      <div className="flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm"><Folder className="text-blue-600" size={24} /></div>
      <FolderNameInput value={name} onChange={setName} onConfirm={onConfirm} onCancel={onCancel} />
      <div className="flex gap-2">
         <button onClick={() => onConfirm(name)} className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors shadow-lg active:scale-90"><Check size={20} /></button>
         <button onClick={onCancel} className="p-3 bg-white text-slate-400 rounded-2xl hover:bg-slate-50 transition-colors active:scale-90 border border-slate-200"><X size={20} /></button>
      </div>
    </div>
  );
};

const FormattedResponse = ({ text, onJumpToPage }: { text: string; onJumpToPage: (page: number) => void }) => {
  let processed = text
    .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<span class="technical-highlight">$1</span>');

  const lines = processed.split('\n');
  const finalBlocks: string[] = [];
  let tableBuffer: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!trimmed.includes('---')) {
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const row = `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
        tableBuffer.push(row);
      }
    } else {
      if (tableBuffer.length > 0) {
        finalBlocks.push(`<table>${tableBuffer.join('')}</table>`);
        tableBuffer = [];
      }
      finalBlocks.push(line);
    }
  });
  if (tableBuffer.length > 0) {
    finalBlocks.push(`<table>${tableBuffer.join('')}</table>`);
  }

  const contentString = finalBlocks.join('\n');
  const segments = contentString.split(/(\[PAGE \d+\])/g);

  return (
    <div className="prose-technical">
      {segments.map((segment, idx) => {
        const pageMatch = segment.match(/\[PAGE (\d+)\]/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1]);
          return (
            <button 
              key={idx} 
              onClick={() => onJumpToPage(pageNum)} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-black uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all mx-1 shadow-sm active:scale-90 align-middle"
              title={`Jump to Page ${pageNum}`}
            >
              <MapPin size={10} /> Page {pageNum}
            </button>
          );
        }
        return <span key={idx} dangerouslySetInnerHTML={{ __html: segment }} />;
      })}
    </div>
  );
};

const PdfViewer = memo(({ fileUrl, scale, isMultiPage, pageNumber, onDocumentLoad, numPages, onPrevPage, onNextPage, isFitToWidth }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width - 80);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const pageProps = useMemo(() => {
    if (isFitToWidth && containerWidth) {
      return { width: containerWidth };
    }
    return { scale: scale };
  }, [isFitToWidth, containerWidth, scale]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-scroll p-10 bg-slate-200/50 flex justify-center custom-scrollbar pdf-scroll-area scroll-smooth">
      <Document 
        file={fileUrl} 
        onLoadSuccess={onDocumentLoad} 
        loading={<div className="p-40 flex flex-col items-center"><Loader2 className="animate-spin text-blue-600 mb-4" size={40}/><p className="font-black text-xs uppercase tracking-widest text-slate-500">Rendering Blueprints...</p></div>}
      >
        {isMultiPage ? (
          Array.from(new Array(numPages || 0), (el, index) => (
            <Page 
              key={`page_${index + 1}`} 
              pageNumber={index + 1} 
              {...pageProps}
              className="mb-10 shadow-2xl rounded-sm overflow-hidden border bg-white" 
              renderAnnotationLayer={true} 
              renderTextLayer={true} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center">
            <Page 
              pageNumber={pageNumber} 
              {...pageProps}
              className="shadow-2xl rounded-sm overflow-hidden border bg-white" 
              renderAnnotationLayer={true} 
              renderTextLayer={true} 
            />
            <div className="fixed bottom-10 flex gap-4 items-center bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl z-50">
              <button disabled={pageNumber <= 1} onClick={onPrevPage} className="p-2 hover:bg-blue-600 rounded-lg disabled:opacity-30 transition-colors"><ChevronLeft/></button>
              <span className="text-xs font-black min-w-[100px] text-center uppercase tracking-widest">Sheet {pageNumber} / {numPages}</span>
              <button disabled={pageNumber >= (numPages || 0)} onClick={onNextPage} className="p-2 hover:bg-blue-600 rounded-lg disabled:opacity-30 transition-colors"><ChevronRight/></button>
            </div>
          </div>
        )}
      </Document>
    </div>
  );
});

const ChatSidebar = ({ chatHistory, onSendMessage, isThinking, onJumpToPage }: any) => {
  const [localInput, setLocalInput] = useState('');
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = useCallback(() => { if (scrollRef.current) { scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); setShowJump(false); } }, []);
  useEffect(() => { scrollToBottom(); }, [chatHistory, isThinking, scrollToBottom]);
  const handleScroll = () => { if (scrollRef.current) { const { scrollTop, scrollHeight, clientHeight } = scrollRef.current; setShowJump(scrollHeight - scrollTop - clientHeight > 200 && chatHistory.length > 0); } };
  const handleSend = () => { if (!localInput.trim() || isThinking) return; onSendMessage(localInput); setLocalInput(''); };
  return (
    <div className="w-[520px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-30">
      <div className="p-8 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div><h3 className="text-xl font-black tracking-tight text-slate-900">AI CONSULTANT</h3><div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><p className="text-blue-600 text-[9px] font-black uppercase tracking-[0.25em]">Direct Code Context Active</p></div></div>
        <div className="flex items-center gap-2"><button onClick={scrollToBottom} title="Scroll to bottom" className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Layout size={18}/></button><div className="p-3 bg-blue-50 rounded-xl"><Sparkles className="text-blue-600" size={20} /></div></div>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 space-y-12 bg-white custom-scrollbar relative">
        {chatHistory.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-6 shadow-inner"><MessageSquare className="text-slate-200" size={40} /></div>
            <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.4em] mb-4">Awaiting Technical Inquiry</h4>
            <p className="text-slate-400 text-[11px] font-bold uppercase leading-relaxed max-w-[280px]">Query architectural codes, load values, or regulatory requirements.</p>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-8 duration-500`}>
            {msg.role === 'user' ? (
              <div className="bg-slate-900 text-white px-7 py-5 rounded-[1.75rem] rounded-tr-none text-[13px] font-bold shadow-2xl max-w-[90%]">{msg.text}</div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                {msg.sourceFileName && (<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 self-start"><Link size={10} className="text-slate-400" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[300px]">Source: {msg.sourceFileName}</span></div>)}
                <div className="w-full bg-white border-2 border-slate-100 rounded-[2.5rem] rounded-tl-none shadow-2xl overflow-hidden">
                  <div className="bg-slate-50/80 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><FileText size={16}/></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Technical Audit Report</span></div>
                     <button onClick={() => navigator.clipboard.writeText(msg.text)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-500 hover:text-blue-600 transition-all uppercase tracking-widest"><ClipboardCheck size={12}/> Copy</button>
                  </div>
                  <div className="p-8 text-[13px] leading-relaxed text-slate-700 font-medium bg-white"><FormattedResponse text={msg.text} onJumpToPage={onJumpToPage} /></div>
                </div>
              </div>
            )}
            <span className="text-[9px] font-black text-slate-300 mt-3 uppercase tracking-[0.3em]">{msg.role === 'user' ? 'QUERY INPUT' : 'AUDIT RESPONSE'}</span>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-5 p-6 bg-blue-50/30 rounded-[2rem] border-2 border-blue-50/50 animate-pulse">
            <div className="flex gap-1.5"><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-800">Compiling technical report...</span>
          </div>
        )}
        {showJump && (<button onClick={scrollToBottom} className="fixed bottom-40 right-[80px] bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all z-50 animate-in slide-in-from-bottom-4"><ArrowDown size={16}/> New Reply Below</button>)}
      </div>
      <div className="p-8 border-t bg-white relative z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="relative group"><textarea value={localInput} onChange={(e) => setLocalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask a specific technical question..." className="w-full pl-8 pr-16 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-[14px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none resize-none min-h-[120px] shadow-inner transition-all placeholder:text-slate-300" /><button onClick={handleSend} disabled={!localInput.trim() || isThinking} className="absolute right-4 bottom-4 p-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95"><Send size={20} /></button></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('WELCOME');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<DesignCodeFile | null>(null);
  const [files, setFiles] = useState<DesignCodeFile[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [itemViewMode, setItemViewMode] = useState<'list' | 'grid'>('grid');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [folderDeletePendingId, setFolderDeletePendingId] = useState<string | null>(null);
  const [countryDeletePendingCode, setCountryDeletePendingCode] = useState<string | null>(null);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingCountry, setIsCreatingCountry] = useState(false);
  const [newCountryData, setNewCountryData] = useState({ name: '', code: '', flag: '🌍', description: '', color: 'bg-blue-600', fullName: '' });

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.95);
  const [isMultiPage, setIsMultiPage] = useState(true);
  const [isFitToWidth, setIsFitToWidth] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [globalAuditResult, setGlobalAuditResult] = useState<{ answer: string; bestFile: DesignCodeFile | null } | null>(null);

  const activeCountryRecord = useMemo(() => 
    countries.find(c => c.code === selectedCountry), 
    [countries, selectedCountry]
  );

  const [serverId, setServerId] = useState<string>('');

  const refreshLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      setServerId(data.serverId || 'unknown');
      
      const storedFiles = data.files || [];
      const storedFolders = data.folders || [];
      let storedCountries = data.countries || [];
      
      if (storedCountries.length === 0) { 
        for (const c of INITIAL_COUNTRIES) {
          try {
            await saveCountryToDB(c);
          } catch (e) {
            // Ignore duplicates during initialization
          }
        }
        // Re-fetch after initialization
        const reResponse = await fetch('/api/data');
        const reData = await reResponse.json();
        storedCountries = reData.countries || [];
      }
      setCountries(storedCountries);
      setFolders(storedFolders);
      setFiles(storedFiles.map((f: any) => ({
        ...f,
        blobUrl: f.serverPath ? `${window.location.origin}${f.serverPath}` : undefined
      })));
    } catch (e) { 
      console.error('Refresh library failed:', e);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
    const unsubscribe = onDataUpdate((update) => {
      console.log('Data updated via socket:', update);
      refreshLibrary();
    });
    return () => unsubscribe();
  }, [refreshLibrary]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, countryCode: CountryCode) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    
    try {
      const fileArray = Array.from(selectedFiles) as File[];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress({ current: i + 1, total: fileArray.length });
        
        const text = await extractTextFromPdf(file);
        const newFile: DesignCodeFile = { 
          id: crypto.randomUUID(), 
          name: file.name, 
          country: countryCode, 
          uploadDate: new Date().toLocaleDateString(), 
          size: file.size, 
          content: text, 
          blob: file, 
          blobUrl: URL.createObjectURL(file), 
          folderPath: currentPath.join('/') 
        };
        await saveFileToDB(newFile);
      }
      await refreshLibrary();
    } catch (err) { 
      alert("Error during multi-file import. Some documents may have failed to process."); 
    } finally { 
      setIsUploading(false); 
      setUploadProgress({ current: 0, total: 0 });
      e.target.value = ''; 
    }
  };

  const executeDeleteFile = async (id: string) => {
    try {
      await deleteFileFromDB(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      setDeletePendingId(null);
      refreshLibrary();
    } catch (err) { console.error(err); }
  };

  const executeDeleteFolder = async (folderId: string) => {
    try {
      const folderToDelete = folders.find(f => f.id === folderId);
      if (!folderToDelete) return;

      const folderPathPrefix = (folderToDelete.parentPath ? folderToDelete.parentPath + '/' : '') + folderToDelete.name;
      const subFolders = folders.filter(f => f.parentPath === folderPathPrefix || f.parentPath.startsWith(folderPathPrefix + '/'));
      for (const sub of subFolders) await deleteFolderFromDB(sub.id);
      
      const affectedFiles = files.filter(f => (f.folderPath || '') === folderPathPrefix || (f.folderPath || '').startsWith(folderPathPrefix + '/'));
      for (const file of affectedFiles) await deleteFileFromDB(file.id);
      
      await deleteFolderFromDB(folderId);
      setFolderDeletePendingId(null);
      refreshLibrary();
    } catch (err) { console.error(err); }
  };

  const executeDeleteCountry = useCallback(async (code: string) => {
    try {
      const countryFiles = files.filter(f => f.country === code);
      for (const file of countryFiles) await deleteFileFromDB(file.id);
      const countryFolders = folders.filter(f => f.country === code);
      for (const folder of countryFolders) await deleteFolderFromDB(folder.id);
      await deleteCountryFromDB(code);
      setCountries(prev => prev.filter(c => c.code !== code));
      setCountryDeletePendingCode(null);
    } catch (err) { refreshLibrary(); }
  }, [files, folders, refreshLibrary]);

  const handleArchiveSearch = async (query: string) => {
    const q = query.trim(); if (!q || !selectedCountry) return;
    const territoryFiles = files.filter(f => f.country === selectedCountry); if (territoryFiles.length === 0) return;
    
    setIsThinking(true);
    setGlobalAuditResult(null); 

    try {
      const result = await globalAiSearch(territoryFiles, q);
      const bestFile = territoryFiles[result.bestFileIndex] || territoryFiles[0];
      setGlobalAuditResult({
        answer: result.answer,
        bestFile: bestFile
      });
    } catch (err) { 
      console.error(err); 
      setGlobalAuditResult({
        answer: "Search engine failed to process the request.",
        bestFile: null
      });
    } finally { 
      setIsThinking(false); 
    }
  };

  const handleConfirmNewFolder = async (name: string) => {
    if (!name.trim()) return;
    await saveFolderToDB({ id: crypto.randomUUID(), name: name.trim(), parentPath: currentPath.join('/'), country: selectedCountry! }); 
    refreshLibrary(); 
    setIsCreatingFolder(false); 
  };

  const handleCreateCountry = async () => {
    if (!newCountryData.name || !newCountryData.code) return;
    try {
      const countryToSave: CountryRecord = {
        ...newCountryData,
        fullName: newCountryData.fullName || newCountryData.name
      };
      await saveCountryToDB(countryToSave);
      await refreshLibrary();
      setIsCreatingCountry(false);
      setNewCountryData({ name: '', code: '', flag: '🌍', description: '', color: 'bg-blue-600', fullName: '' });
    } catch (err: any) {
      console.error('Create country failed:', err);
      if (err.message?.includes('400') || err.message?.includes('exists')) {
        alert("This region code already exists. Please use a unique code.");
      } else {
        alert("Server Error: Your hosting (Netlify) might not support the backend server required for this app. Please use a platform like Render or Railway for full-stack apps.");
      }
    }
  };

  const currentLevelFolders = useMemo(() => {
    const parentPathStr = currentPath.join('/');
    return folders.filter(f => f.parentPath === parentPathStr && f.country === selectedCountry);
  }, [folders, currentPath, selectedCountry]);

  const currentLevelFiles = useMemo(() => {
    const fullPath = currentPath.join('/');
    return files.filter(f => f.country === selectedCountry && (f.folderPath || '') === fullPath);
  }, [files, selectedCountry, currentPath]);

  const getFileCountForFolder = useCallback((folderName: string) => {
    const fullPath = [...currentPath, folderName].join('/');
    return files.filter(f => f.country === selectedCountry && (f.folderPath || '') === fullPath).length;
  }, [files, currentPath, selectedCountry]);

  const handleFileClick = useCallback((file: DesignCodeFile) => {
    setSelectedPdf(file);
    setView('ANALYSIS');
    setChatHistory([]);
    setPageNumber(1);
  }, []);

  const welcomeView = (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-6 animate-in fade-in relative bg-[#253A32] overflow-hidden">
      <div className="w-64 h-64 mb-12 hover:scale-105 transition-all animate-in zoom-in duration-700">
        <InSiteLogo className="w-full h-full" rounded="rounded-none" />
      </div>
      <h1 style={{ fontFamily: 'Arial, sans-serif', color: '#8ED96C' }} className="text-5xl font-bold mb-4 uppercase tracking-tight leading-tight">STANDARDS &<br />DESIGN GUIDELINES</h1>
      <p style={{ fontFamily: 'Arial, sans-serif', color: '#8ED96C' }} className="text-[11px] font-bold max-w-xl mb-10 uppercase opacity-90 tracking-[0.15em]">CERTIFIED TECHNICAL REPOSITORY FOR REGIONAL ENGINEERING STANDARDS.</p>
      <button onClick={() => setView('COUNTRIES')} className="px-10 py-3 border-2 border-white text-white font-bold uppercase text-[13px] tracking-[0.2em] rounded-lg hover:bg-white hover:text-[#253A32] transition-all">OPEN ARCHIVES</button>
    </div>
  );

  const countryListView = (
    <div className="max-w-7xl mx-auto py-24 px-10 animate-in slide-in-from-bottom-12">
      <div className="flex items-center justify-between mb-16">
        <h2 className="text-6xl font-black tracking-tighter uppercase italic text-[#0F172A]">Regional Archives</h2>
        <button 
          onClick={() => setIsCreatingCountry(true)}
          className="flex items-center gap-3 bg-[#0F172A] text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
        >
          <Plus size={16} /> Add New Region
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {countries.map((c) => {
          const isDeleting = countryDeletePendingCode === c.code;
          const countryFiles = files.filter(f => f.country === c.code);
          
          // Map codes for the icon display
          const displayCode = c.code === 'KSA' ? 'SA' : c.code === 'Qatar' ? 'QA' : c.code === 'UAE' ? 'AE' : c.code.substring(0, 2).toUpperCase();

          return (
            <div key={c.code} className="relative group">
              <div 
                onClick={() => { setSelectedCountry(c.code); setView('COUNTRY_DETAIL'); setCurrentPath([]); setGlobalAuditResult(null); }} 
                className="bg-white rounded-2xl border border-slate-100 p-10 cursor-pointer hover:shadow-xl transition-all relative h-full flex flex-col"
              >
                <div className={`w-14 h-14 rounded-xl ${c.color} flex items-center justify-center text-sm font-bold text-white mb-8 shadow-sm group-hover:scale-105 transition-transform`}>
                  {displayCode}
                </div>
                
                <h3 className="text-xl font-black mb-3 text-[#0F172A] uppercase">{c.name}</h3>
                <p className="text-slate-400 font-medium mb-10 leading-relaxed text-[13px] h-12 line-clamp-2">
                  {c.description}
                </p>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{countryFiles.length} Files</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCountryDeletePendingCode(c.code); }} 
                      className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16}/>
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
              {isDeleting && (
                <div className="absolute inset-0 bg-red-600 rounded-2xl flex flex-col items-center justify-center px-8 text-center text-white z-50 animate-in fade-in zoom-in">
                   <AlertTriangle size={32} className="mb-4 animate-bounce" />
                   <h4 className="text-lg font-black uppercase mb-2">Delete Archive?</h4>
                   <p className="text-[11px] font-medium mb-8 uppercase tracking-widest leading-relaxed">This will permanently remove the <strong>{c.name}</strong> library.</p>
                   <div className="flex flex-col w-full gap-3">
                      <button onClick={() => executeDeleteCountry(c.code)} className="bg-white text-red-600 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Confirm</button>
                      <button onClick={() => setCountryDeletePendingCode(null)} className="text-white border-2 border-white/30 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                   </div>
                </div>
              )}
            </div>
          );
        })}
        {/* Dash Card for Add Region */}
        <div 
          onClick={() => setIsCreatingCountry(true)}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group min-h-[320px]"
        >
           <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Plus size={24} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
           </div>
           <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.2em] group-hover:text-blue-600 transition-colors">Add Region</h3>
        </div>
      </div>
    </div>
  );

  const countryDetailView = (
    <div className="max-w-7xl mx-auto py-12 px-10 animate-in fade-in pb-40">
      <div className="flex items-center justify-between mb-16">
        <button onClick={() => setView('COUNTRIES')} className="flex items-center text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-3 group-hover:-translate-x-1 transition-transform" /> Region Select
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-white border border-slate-100 px-6 py-2.5 rounded-2xl shadow-sm">
             <button onClick={() => setCurrentPath([])} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
               <Home size={14} className="text-slate-400" />
               <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{activeCountryRecord?.name}</span>
             </button>
             {currentPath.map((p, idx) => (
               <React.Fragment key={p}>
                 <ChevronRight size={10} className="text-slate-300 mx-1" />
                 <button onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))} className="text-[10px] font-black uppercase text-blue-600 hover:underline">{p}</button>
               </React.Fragment>
             ))}
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-2">
             <button onClick={() => setItemViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${itemViewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18} /></button>
             <button onClick={() => setItemViewMode('list')} className={`p-2.5 rounded-xl transition-all ${itemViewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
          </div>
          <button onClick={() => setIsCreatingFolder(true)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all border border-slate-200 shadow-sm"><FolderPlus size={18} className="text-slate-900"/></button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-16">
        <div className="flex items-center gap-8">
          <div className={`w-24 h-24 rounded-[1.75rem] ${activeCountryRecord?.color} flex items-center justify-center text-4xl shadow-2xl font-black text-white italic`}>{activeCountryRecord?.code.substring(0, 2).toUpperCase()}</div>
          <div>
            <h2 className="text-6xl font-black tracking-tighter uppercase italic text-slate-900 leading-none">{activeCountryRecord?.fullName}</h2>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Certified Technical Repository</p>
          </div>
        </div>
        <label className="bg-[#0f172a] text-white px-10 py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] cursor-pointer hover:bg-slate-800 transition-all shadow-3xl flex items-center gap-4 active:scale-95">
          <FileUp size={20} /> Import Blueprints
          <input type="file" className="hidden" accept=".pdf" multiple onChange={(e) => handleFileUpload(e, activeCountryRecord!.code)} />
        </label>
      </div>

      <AuditSearchBar onSearch={handleArchiveSearch} isThinking={isThinking} />

      <div className="mb-16">
        {isCreatingFolder && (
          <NewFolderRow onConfirm={handleConfirmNewFolder} onCancel={() => setIsCreatingFolder(false)} />
        )}

        {itemViewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {currentLevelFolders.map(folder => {
              const isPendingDelete = folderDeletePendingId === folder.id;
              const count = getFileCountForFolder(folder.name);
              return (
                <div 
                  key={folder.id} 
                  onClick={() => { if (!isPendingDelete) setCurrentPath(prev => [...prev, folder.name]); }}
                  className={`group relative bg-white border border-slate-100 p-8 rounded-[2.5rem] cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all text-center flex flex-col items-center overflow-hidden ${isPendingDelete ? 'border-red-200' : ''}`}
                >
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${isPendingDelete ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                     {isPendingDelete ? <AlertTriangle size={32} /> : <Folder size={32} />}
                   </div>
                   <h4 className={`text-[13px] font-black uppercase tracking-tight truncate w-full ${isPendingDelete ? 'text-red-700' : 'text-slate-900'}`}>{folder.name}</h4>
                   <span className="text-[9px] font-black text-slate-300 mt-2 uppercase tracking-[0.2em]">{isPendingDelete ? 'Confirm Delete?' : `${count} Files`}</span>
                   
                   {isPendingDelete ? (
                     <div className="absolute inset-x-0 bottom-0 bg-red-600 p-2 flex gap-1 z-10 animate-in slide-in-from-bottom-full">
                        <button onClick={(e) => { e.stopPropagation(); executeDeleteFolder(folder.id); }} className="flex-1 py-2 bg-white text-red-600 text-[9px] font-black uppercase rounded-xl">Yes</button>
                        <button onClick={(e) => { e.stopPropagation(); setFolderDeletePendingId(null); }} className="flex-1 py-2 bg-red-700 text-white text-[9px] font-black uppercase rounded-xl">No</button>
                     </div>
                   ) : (
                     <button 
                      onClick={(e) => { e.stopPropagation(); setFolderDeletePendingId(folder.id); }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-red-500 transition-all"
                     >
                       <Trash2 size={14} />
                     </button>
                   )}
                </div>
              );
            })}
            {currentLevelFiles.map(file => {
              const isPendingDelete = deletePendingId === file.id;
              return (
                <div 
                  key={file.id} 
                  onClick={() => { if (!isPendingDelete) handleFileClick(file); }}
                  className={`group relative bg-white border border-slate-100 p-8 rounded-[2.5rem] cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all text-center flex flex-col items-center overflow-hidden ${isPendingDelete ? 'border-red-200' : ''}`}
                >
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${isPendingDelete ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                     {isPendingDelete ? <AlertTriangle size={32} /> : <FileText size={32} />}
                   </div>
                   <h4 className={`text-[13px] font-black uppercase tracking-tight truncate w-full ${isPendingDelete ? 'text-red-700' : 'text-slate-900'}`}>{file.name}</h4>
                   <span className="text-[9px] font-black text-slate-300 mt-2 uppercase tracking-[0.2em]">{isPendingDelete ? 'Confirm Delete?' : 'Blueprint'}</span>

                   {isPendingDelete ? (
                     <div className="absolute inset-x-0 bottom-0 bg-red-600 p-2 flex gap-1 z-10 animate-in slide-in-from-bottom-full">
                        <button onClick={(e) => { e.stopPropagation(); executeDeleteFile(file.id); }} className="flex-1 py-2 bg-white text-red-600 text-[9px] font-black uppercase rounded-xl">Yes</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletePendingId(null); }} className="flex-1 py-2 bg-red-700 text-white text-[9px] font-black uppercase rounded-xl">No</button>
                     </div>
                   ) : (
                     <button 
                      onClick={(e) => { e.stopPropagation(); setDeletePendingId(file.id); }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-red-500 transition-all"
                     >
                       <Trash2 size={14} />
                     </button>
                   )}
                </div>
              );
            })}
            {currentLevelFolders.length === 0 && currentLevelFiles.length === 0 && !isCreatingFolder && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem] opacity-30">
                <FolderOpen size={48} className="text-slate-300 mb-6" />
                <p className="text-[12px] font-black uppercase tracking-[0.5em]">Workspace is empty</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="grid grid-cols-[1fr_120px_120px_120px] px-10 py-5 bg-slate-50 border-b border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Items / Info</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Size</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</span>
             </div>
             <div className="divide-y divide-slate-50">
                {currentLevelFolders.map(folder => {
                   const isPendingDelete = folderDeletePendingId === folder.id;
                   const count = getFileCountForFolder(folder.name);
                   return (
                     <div key={folder.id} onClick={() => { if (!isPendingDelete) setCurrentPath(prev => [...prev, folder.name]); }} className={`grid grid-cols-[1fr_120px_120px_120px] px-10 py-6 hover:bg-slate-50 cursor-pointer items-center group transition-colors ${isPendingDelete ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center gap-4">
                           <Folder className={isPendingDelete ? 'text-red-500' : 'text-blue-500'} size={18} />
                           <span className={`text-[13px] font-bold ${isPendingDelete ? 'text-red-700' : 'text-slate-900'}`}>{folder.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isPendingDelete ? 'text-red-600' : 'text-blue-600'}`}>
                          {count} Files
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 text-center">--</span>
                        <div className="flex justify-end">
                           {isPendingDelete ? (
                             <div className="flex items-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); executeDeleteFolder(folder.id); }} className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded shadow-sm">Confirm</button>
                               <button onClick={(e) => { e.stopPropagation(); setFolderDeletePendingId(null); }} className="px-3 py-1 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded">No</button>
                             </div>
                           ) : (
                             <button onClick={(e) => { e.stopPropagation(); setFolderDeletePendingId(folder.id); }} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                           )}
                        </div>
                     </div>
                   );
                })}
                {currentLevelFiles.map(file => {
                   const isPendingDelete = deletePendingId === file.id;
                   return (
                     <div key={file.id} onClick={() => { if (!isPendingDelete) handleFileClick(file); }} className={`grid grid-cols-[1fr_120px_120px_120px] px-10 py-6 hover:bg-slate-50 cursor-pointer items-center group transition-colors ${isPendingDelete ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center gap-4">
                           <FileText className={isPendingDelete ? 'text-red-500' : 'text-slate-400'} size={18} />
                           <span className={`text-[13px] font-bold ${isPendingDelete ? 'text-red-700' : 'text-slate-900'}`}>{file.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Blueprint</span>
                        <span className="text-[10px] font-medium text-slate-400 text-center">{(file.size / 1024).toFixed(0)} KB</span>
                        <div className="flex justify-end">
                           {isPendingDelete ? (
                             <div className="flex items-center gap-2">
                               <button onClick={(e) => { e.stopPropagation(); executeDeleteFile(file.id); }} className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded shadow-sm">Confirm</button>
                               <button onClick={(e) => { e.stopPropagation(); setDeletePendingId(null); }} className="px-3 py-1 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded">No</button>
                             </div>
                           ) : (
                             <button onClick={(e) => { e.stopPropagation(); setDeletePendingId(file.id); }} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                           )}
                        </div>
                     </div>
                   );
                })}
                {currentLevelFolders.length === 0 && currentLevelFiles.length === 0 && (
                   <div className="p-16 text-center opacity-20"><p className="text-[10px] font-black uppercase tracking-[0.5em]">No items in this directory</p></div>
                )}
             </div>
          </div>
        )}
      </div>

      {globalAuditResult && (
        <div className="mb-16 animate-in slide-in-from-top-8 duration-700">
           <div className="bg-white border-2 border-slate-100 rounded-[3.5rem] shadow-2xl overflow-hidden">
              <div className="bg-slate-50/80 px-12 py-6 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><Sparkles size={20}/></div>
                    <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Global Library Audit Report</span>
                 </div>
                 {globalAuditResult.bestFile && (
                   <button 
                    onClick={() => { if(globalAuditResult.bestFile) { handleFileClick(globalAuditResult.bestFile); setChatHistory([{ role: 'model', text: globalAuditResult.answer, timestamp: Date.now(), sourceFileName: globalAuditResult.bestFile?.name }]); } }} 
                    className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                   >
                     <ExternalLink size={16} /> Open Source Blueprint
                   </button>
                 )}
              </div>
              <div className="p-12">
                 <div className="flex items-center gap-3 mb-8 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 w-fit">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Document: {globalAuditResult.bestFile?.name || 'Multiple Sources'}</span>
                 </div>
                 <div className="text-[15px] leading-relaxed text-slate-700 font-medium bg-white">
                    <FormattedResponse text={globalAuditResult.answer} onJumpToPage={(p) => { if(globalAuditResult.bestFile) { handleFileClick(globalAuditResult.bestFile); setPageNumber(p); setChatHistory([{ role: 'model', text: globalAuditResult.answer, timestamp: Date.now() }]); } }} />
                 </div>
              </div>
              <div className="px-12 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setGlobalAuditResult(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">Dismiss Report</button>
              </div>
           </div>
        </div>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl max-w-md w-full text-center border border-slate-100 scale-in-center">
              <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10">
                 <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-4">Importing Library</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-12 leading-relaxed">Extracting technical data from architectural blueprints...</p>
              
              <div className="bg-slate-50 rounded-full h-4 w-full overflow-hidden border border-slate-100 mb-6">
                 <div 
                  className="bg-blue-600 h-full transition-all duration-500 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                 />
              </div>
              <div className="flex justify-between items-center px-2">
                 <span className="text-[11px] font-black text-slate-900 uppercase">Document {uploadProgress.current}</span>
                 <span className="text-[11px] font-black text-blue-600 uppercase">Total {uploadProgress.total}</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  const analysisView = selectedPdf && (
    <div className="h-[calc(100vh-80px)] flex bg-slate-100 overflow-hidden animate-in fade-in duration-500 relative">
      <div className="flex-1 flex flex-col min-0">
        <div className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('COUNTRY_DETAIL')} className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-colors bg-slate-50 rounded-xl border border-slate-200 group"><ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Exit Audit</button>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button onClick={() => setIsMultiPage(false)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isMultiPage ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}>Sheet</button>
              <button onClick={() => setIsMultiPage(true)} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isMultiPage ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400'}`}>Full</button>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-2">
               <button 
                onClick={() => { setScale(s => Math.max(0.3, s - 0.2)); setIsFitToWidth(false); }} 
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors" 
                title="Zoom Out"
               >
                <ZoomOut size={16}/>
               </button>
               <span className="text-[10px] font-black w-14 text-center text-slate-600 tabular-nums">
                 {isFitToWidth ? 'FIT' : `${(scale * 100).toFixed(0)}%`}
               </span>
               <button 
                onClick={() => { setScale(s => Math.min(3.0, s + 0.2)); setIsFitToWidth(false); }} 
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors" 
                title="Zoom In"
               >
                <ZoomIn size={16}/>
               </button>
               <div className="w-px h-4 bg-slate-200 mx-1"></div>
               <button 
                onClick={() => setIsFitToWidth(!isFitToWidth)} 
                className={`p-2 transition-colors ${isFitToWidth ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`} 
                title="Fit to Width"
               >
                <Maximize2 size={16}/>
               </button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border truncate max-w-[300px] shadow-inner"><FileText size={14} className="text-slate-400" /><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">{selectedPdf.name}</span></div>
        </div>
        <PdfViewer 
          fileUrl={selectedPdf.blobUrl} 
          scale={scale} 
          isMultiPage={isMultiPage} 
          pageNumber={pageNumber} 
          numPages={numPages} 
          isFitToWidth={isFitToWidth}
          onDocumentLoad={({ numPages }: any) => setNumPages(numPages)} 
          onPrevPage={() => setPageNumber(p => p - 1)} 
          onNextPage={() => setPageNumber(p => p + 1)} 
        />
      </div>
      <ChatSidebar 
        chatHistory={chatHistory} 
        onSendMessage={async (q: string) => {
          setChatHistory(prev => [...prev, { role: 'user', text: q, timestamp: Date.now() }]);
          setIsThinking(true);
          try {
            const r = await askAboutPdf(selectedPdf.content, q, chatHistory);
            setChatHistory(prev => [...prev, { role: 'model', text: r, timestamp: Date.now() }]);
          } catch (e) {
            setChatHistory(prev => [...prev, { role: 'model', text: "Error generating report.", timestamp: Date.now() }]);
          } finally {
            setIsThinking(false);
          }
        }} 
        isThinking={isThinking} 
        onJumpToPage={(p: number)=>{ setPageNumber(p); }} 
      />
    </div>
  );

  return (
    <div className={`min-h-screen ${view === 'WELCOME' ? 'bg-[#253A32]' : 'bg-slate-50'} font-sans antialiased transition-colors duration-1000 overflow-x-hidden`}>
      <header className={`h-20 border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 ${view === 'WELCOME' ? 'bg-[#253A32]/80 border-white/10' : 'bg-white/95'} backdrop-blur-2xl z-[100] shadow-sm`}>
        <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setView('WELCOME')}>
          <div className={`${view === 'WELCOME' ? '' : 'bg-[#253A32]'} p-1.5 rounded-xl transition-all`}>
            <InSiteLogo className="w-8 h-8 group-hover:rotate-6 transition-all flex-shrink-0" rounded="rounded-lg" />
          </div>
          <span className={`font-black text-lg leading-none uppercase italic whitespace-nowrap ${view === 'WELCOME' ? 'text-[#8ED96C]' : 'text-slate-900'}`}>STANDARDS & DESIGN GUIDELINES</span>
        </div>
        <div className="flex-1 max-w-3xl mx-20"/>
      </header>
      <main className="relative">
        {view === 'WELCOME' && welcomeView}
        {view === 'COUNTRIES' && countryListView}
        {view === 'COUNTRY_DETAIL' && countryDetailView}
        {view === 'ANALYSIS' && analysisView}
      </main>

      {/* Debug Info */}
      <div className="fixed bottom-4 right-4 text-[10px] text-gray-400 bg-black/50 p-2 rounded-md pointer-events-none z-50 font-mono">
        Server ID: {serverId} | Sync: {new Date().toLocaleTimeString()}
      </div>

      {/* New Region Modal */}
      {isCreatingCountry && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl max-w-2xl w-full border border-slate-100 animate-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-12">
                 <h3 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Add New Archive</h3>
                 <button onClick={() => setIsCreatingCountry(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-10">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Region Name</label>
                    <input 
                      type="text" 
                      value={newCountryData.name} 
                      onChange={(e) => setNewCountryData({...newCountryData, name: e.target.value})} 
                      placeholder="e.g. Oman" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">ISO Code (3 Chars)</label>
                    <input 
                      type="text" 
                      value={newCountryData.code} 
                      onChange={(e) => setNewCountryData({...newCountryData, code: e.target.value.toUpperCase().slice(0, 3)})} 
                      placeholder="e.g. OMN" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Flag Emoji</label>
                    <input 
                      type="text" 
                      value={newCountryData.flag} 
                      onChange={(e) => setNewCountryData({...newCountryData, flag: e.target.value})} 
                      placeholder="e.g. 🇴🇲" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Region Identity (Color)</label>
                    <div className="grid grid-cols-5 gap-3 p-1">
                       {PALETTE_COLORS.map((color) => (
                         <button
                           key={color.class}
                           onClick={() => setNewCountryData({...newCountryData, color: color.class})}
                           className={`w-full aspect-square rounded-xl transition-all relative ${color.class} ${newCountryData.color === color.class ? 'ring-4 ring-offset-4 ring-blue-500 scale-90' : 'hover:scale-105 shadow-md'}`}
                           title={color.name}
                         >
                           {newCountryData.color === color.class && (
                             <div className="absolute inset-0 flex items-center justify-center text-white">
                               <Check size={16} strokeWidth={4} />
                             </div>
                           )}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
              
              <div className="space-y-2 mb-12">
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Description</label>
                 <textarea 
                  value={newCountryData.description} 
                  onChange={(e) => setNewCountryData({...newCountryData, description: e.target.value})} 
                  placeholder="Describe the standards in this archive..." 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                 />
              </div>
              
              <div className="flex gap-4">
                 <button 
                  onClick={handleCreateCountry}
                  className="flex-1 bg-slate-900 text-white py-6 rounded-3xl text-sm font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95"
                 >
                   Establish Archive
                 </button>
                 <button 
                  onClick={() => setIsCreatingCountry(false)}
                  className="px-12 bg-slate-50 text-slate-400 py-6 rounded-3xl text-sm font-black uppercase tracking-[0.3em] hover:bg-slate-100 transition-all"
                 >
                   Discard
                 </button>
              </div>
           </div>
        </div>
      )}

      <Signature view={view} />
      {isThinking && view === 'COUNTRIES' && (<div className="fixed inset-0 bg-white/80 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500"><Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-8" /><p className="text-slate-400 font-black uppercase text-[12px] tracking-[1em] animate-pulse">Syncing Library Hierarchy...</p></div>)}
    </div>
  );
};

export default App;