
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, Key, Download, Upload, Settings, Video, LayoutGrid, Heart, ExternalLink, FileJson, Book, Music, Tv } from 'lucide-react';
import { YouTubeService } from '../services/youtubeService';
import { ChannelInfo, AppSettings } from '../types';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingChannels: ChannelInfo[];
}

type ExportCategory = 'DATA1' | 'DATA2' | 'DATA3';

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [shortsUrls, setShortsUrls] = useState<string[]>(['']);
  const [dramaUrls, setDramaUrls] = useState<string[]>(['']);
  const [yadamUrls, setYadamUrls] = useState<string[]>(['']);
  const [musicUrls, setMusicUrls] = useState<string[]>(['']);
  const [myChannelUrls, setMyChannelUrls] = useState<string[]>(['']);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [exportPrefix, setExportPrefix] = useState<ExportCategory>('DATA1');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const s = YouTubeService.getSettings();
      setApiKey(s.apiKey || '');
      setShortsUrls(s.shortsChannelUrls?.length ? s.shortsChannelUrls : ['']);
      setDramaUrls(s.longformDramaUrls?.length ? s.longformDramaUrls : ['']);
      setYadamUrls(s.longformYadamUrls?.length ? s.longformYadamUrls : ['']);
      setMusicUrls(s.longformMusicUrls?.length ? s.longformMusicUrls : ['']);
      setMyChannelUrls(s.myChannelUrls?.length ? s.myChannelUrls : ['']);
      setInterestedIds(s.interestedChannelIds || []);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getCurrentConfig = (): AppSettings => ({
    apiKey,
    shortsChannelUrls: shortsUrls.filter(u => u.trim()),
    longformDramaUrls: dramaUrls.filter(u => u.trim()),
    longformYadamUrls: yadamUrls.filter(u => u.trim()),
    longformMusicUrls: musicUrls.filter(u => u.trim()),
    longformChannelUrls: [], 
    myChannelUrls: myChannelUrls.filter(u => u.trim()),
    interestedChannelIds: interestedIds
  });

  const handleSave = () => {
    YouTubeService.saveSettings(apiKey, shortsUrls, dramaUrls, yadamUrls, musicUrls, myChannelUrls, interestedIds);
    onSave();
    onClose();
  };

  const handleExport = () => {
    const config = getCurrentConfig();
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${yy}-${mm}-${dd}`;
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportPrefix}_${formattedDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.apiKey !== undefined) setApiKey(json.apiKey);
        if (json.shortsChannelUrls) setShortsUrls(json.shortsChannelUrls.length ? json.shortsChannelUrls : ['']);
        if (json.longformDramaUrls) setDramaUrls(json.longformDramaUrls);
        if (json.longformYadamUrls) setYadamUrls(json.longformYadamUrls);
        if (json.longformMusicUrls) setMusicUrls(json.longformMusicUrls);
        if (json.myChannelUrls) setMyChannelUrls(json.myChannelUrls.length ? json.myChannelUrls : ['']);
        if (json.interestedChannelIds) setInterestedIds(json.interestedChannelIds);
        alert('설정을 성공적으로 불러왔습니다.');
      } catch (err) { alert('유효하지 않은 파일입니다.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderUrlInputs = (urls: string[], setUrls: React.Dispatch<React.SetStateAction<string[]>>, label: string, icon: React.ReactNode, accentClass: string = "text-gray-500") => (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${accentClass}`}>
          {icon} {label}
        </label>
        <button onClick={() => setUrls(['', ...urls])} className="text-[11px] bg-gray-900 text-white font-black px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-black transition-all shadow-sm active:scale-95">
          <Plus size={14} /> 추가
        </button>
      </div>
      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
        {urls.map((url, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-300 shadow-sm group hover:border-gray-500 transition-all">
            <input 
              style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              className="flex-1 border-none outline-none text-sm font-bold px-3 py-2 placeholder-gray-400 rounded-lg"
              placeholder="채널 URL 또는 @핸들"
              value={url}
              onChange={(e) => {
                const next = [...urls];
                next[idx] = e.target.value;
                setUrls(next);
              }}
            />
            <button 
              onClick={() => {
                const next = urls.filter((_, i) => i !== idx);
                setUrls(next.length ? next : ['']);
              }}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Settings className="text-red-600" /> 채널 관리 및 설정
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400"><X /></button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto space-y-10 custom-scrollbar bg-white">
          {/* JSON Controls */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-200 shadow-inner">
              <div className="flex items-center justify-between px-1">
                 <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <FileJson size={14} className="text-blue-500" /> 설정 데이터 관리 (JSON)
                 </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex p-1 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  {(['DATA1', 'DATA2', 'DATA3'] as ExportCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setExportPrefix(cat)}
                      className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${exportPrefix === cat ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button onClick={handleExport} className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95 text-gray-700">
                    <Download size={14} /> 내보내기
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:border-gray-400 transition-all shadow-sm active:scale-95 text-gray-700">
                    <Upload size={14} /> 가져오기
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                </div>
              </div>
            </div>
          </div>

          {/* URL Inputs Grouped */}
          <div className="space-y-12">
            {/* Shorts Section */}
            <div>
              {renderUrlInputs(shortsUrls, setShortsUrls, "Shorts 분석 채널", <LayoutGrid size={16} />, "text-red-500")}
            </div>

            {/* Longform Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
              {renderUrlInputs(dramaUrls, setDramaUrls, "Longform: 드라마", <Tv size={16} />, "text-blue-500")}
              {renderUrlInputs(yadamUrls, setYadamUrls, "Longform: 야담", <Book size={16} />, "text-amber-600")}
              {renderUrlInputs(musicUrls, setMusicUrls, "Longform: 뮤직플리", <Music size={16} />, "text-purple-600")}
              {renderUrlInputs(myChannelUrls, setMyChannelUrls, "나의 채널 리스트", <Heart size={16} />, "text-pink-500")}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-4 pt-10 border-t border-gray-100">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Key size={16} className="text-yellow-500" /> YouTube API Key
              </label>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                GCP 콘솔 열기 <ExternalLink size={12} />
              </a>
            </div>
            <input 
              style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
              type="password"
              placeholder="API 키를 입력하세요"
              className="w-full px-5 py-4 border border-gray-300 rounded-2xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono text-sm shadow-sm placeholder-gray-300"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-white border-t border-gray-100">
          <button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 text-base">
            <Save size={20} /> 모든 설정 저장 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
