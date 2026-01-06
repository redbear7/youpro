
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Settings, Youtube, LayoutGrid, Trophy, Video, Heart, X, ExternalLink, Play, Sparkles, ChevronDown, Bookmark, Download, Upload, RefreshCcw, Clock, Tv, Book, Music, Search } from 'lucide-react';
import { YouTubeVideo, ChannelInfo, SortOrder, ViewType } from './types';
import { YouTubeService, SavedItem, FeedCache } from './services/youtubeService';
import { GoogleGenAI } from "@google/genai";
import VideoCard from './components/VideoCard';
import RegistrationModal from './components/RegistrationModal';
import ChannelRankingTable from './components/ChannelRankingTable';

const App: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  
  const [longformSort, setLongformSort] = useState<SortOrder>(SortOrder.LATEST);
  const [shortsSort, setShortsSort] = useState<SortOrder>(SortOrder.LATEST);
  const [mychannelSort, setMychannelSort] = useState<SortOrder>(SortOrder.LATEST);
  const [bookmarksSort, setBookmarksSort] = useState<SortOrder>(SortOrder.LATEST);
  
  const [viewType, setViewType] = useState<ViewType>('shorts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ title: string; content: string } | null>(null);

  const bookmarkFileInputRef = useRef<HTMLInputElement>(null);

  const currentSortOrder = useMemo(() => {
    if (viewType === 'bookmarks') return bookmarksSort;
    if (viewType.startsWith('mychannel')) return mychannelSort;
    if (viewType.startsWith('longform')) return longformSort;
    return shortsSort;
  }, [viewType, mychannelSort, longformSort, shortsSort, bookmarksSort]);

  const syncFromCache = useCallback(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    if (viewType === 'bookmarks') {
      const saved = YouTubeService.getSavedItems();
      let v = saved.map(s => s.video);
      let c = saved.map(s => s.channel);
      
      if (bookmarksSort === SortOrder.LATEST) {
        v.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } else if (bookmarksSort === SortOrder.POPULAR) {
        v = v.filter(item => new Date(item.publishedAt).getTime() >= ninetyDaysAgo).sort((a, b) => b.viewCount - a.viewCount);
      } else if (bookmarksSort === SortOrder.COMMENTS) {
        v = v.filter(item => new Date(item.publishedAt).getTime() >= ninetyDaysAgo).sort((a, b) => b.commentCount - a.commentCount);
      } else if (bookmarksSort === SortOrder.DURATION) {
        v.sort((a, b) => YouTubeService.ISO8601ToSeconds(b.duration || 'PT0S') - YouTubeService.ISO8601ToSeconds(a.duration || 'PT0S'));
      }
      setVideos(v);
      setChannels(c);
      setLastUpdateTime(null);
      return;
    }

    const cache = YouTubeService.getFeedCache(viewType);
    if (cache) {
      let v = [...cache.videos];
      if (viewType.startsWith('mychannel')) {
        v = v.filter(item => new Date(item.publishedAt).getTime() >= ninetyDaysAgo);
      }
      
      if (currentSortOrder === SortOrder.LATEST) {
        v.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } else if (currentSortOrder === SortOrder.POPULAR) {
        v = v.filter(item => new Date(item.publishedAt).getTime() >= ninetyDaysAgo).sort((a, b) => b.viewCount - a.viewCount);
      } else if (currentSortOrder === SortOrder.COMMENTS) {
        v = v.filter(item => new Date(item.publishedAt).getTime() >= ninetyDaysAgo).sort((a, b) => b.commentCount - a.commentCount);
      } else if (currentSortOrder === SortOrder.DURATION) {
        v.sort((a, b) => YouTubeService.ISO8601ToSeconds(b.duration || 'PT0S') - YouTubeService.ISO8601ToSeconds(a.duration || 'PT0S'));
      }
      
      setVideos(v);
      setChannels(cache.channels);
      setLastUpdateTime(cache.updatedAt);
    } else {
      setVideos([]);
      setChannels([]);
      setLastUpdateTime(null);
    }
  }, [viewType, currentSortOrder, bookmarksSort]);

  useEffect(() => {
    syncFromCache();
    setSearchQuery('');
  }, [viewType, syncFromCache]);

  const handleUpdate = async () => {
    if (viewType === 'bookmarks') return; 
    setIsLoading(true);
    try {
      const data = await YouTubeService.fetchVideos(currentSortOrder, viewType);
      const cache = YouTubeService.saveFeedCache(viewType, data);
      setVideos(data.videos);
      setChannels(data.channels);
      setLastUpdateTime(cache.updatedAt);
      syncFromCache();
    } catch (error) {
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (newSort: SortOrder) => {
    if (viewType === 'bookmarks') setBookmarksSort(newSort);
    else if (viewType.startsWith('mychannel')) setMychannelSort(newSort);
    else if (viewType.startsWith('longform')) setLongformSort(newSort);
    else if (viewType === 'shorts') setShortsSort(newSort);
  };

  const isRankingMode = viewType === 'ranking_shorts' || viewType === 'ranking_longform';

  const getViewTitle = () => {
    switch(viewType) {
      case 'shorts': return '쇼츠 피드';
      case 'longform_drama': return '롱폼: 드라마';
      case 'longform_yadam': return '롱폼: 야담';
      case 'longform_music': return '롱폼: 뮤직플리';
      case 'bookmarks': return '북마크 저장소';
      case 'ranking_shorts':
      case 'ranking_longform': return '랭킹 보드';
      default: return viewType.startsWith('mychannel') ? '내 채널 피드' : '롱폼 대시보드';
    }
  };

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const query = searchQuery.toLowerCase();
    return videos.filter(v => 
      v.title.toLowerCase().includes(query) || 
      v.channelTitle.toLowerCase().includes(query)
    );
  }, [videos, searchQuery]);

  return (
    <div className="min-h-screen pb-20 bg-[#F8F9FA]">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setViewType('shorts')}>
              <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                <Youtube className="text-white w-5 h-5" fill="currentColor" />
              </div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight hidden lg:block">Youtube Pro</h1>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setViewType('shorts')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType === 'shorts' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={14} /> <span className="hidden sm:inline">쇼츠</span></button>
              
              <div className="w-px h-4 bg-gray-200 my-auto mx-1" />
              
              <button onClick={() => setViewType('longform_drama')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType === 'longform_drama' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Tv size={14} /> <span className="hidden sm:inline">드라마</span></button>
              <button onClick={() => setViewType('longform_yadam')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType === 'longform_yadam' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}><Book size={14} /> <span className="hidden sm:inline">야담</span></button>
              <button onClick={() => setViewType('longform_music')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType === 'longform_music' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}><Music size={14} /> <span className="hidden sm:inline">뮤직</span></button>
              
              <div className="w-px h-4 bg-gray-200 my-auto mx-1" />

              <button onClick={() => setViewType('mychannel_shorts')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType.startsWith('mychannel') ? 'bg-white shadow-sm text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}><Heart size={14} /> <span className="hidden sm:inline">내채널</span></button>
              <button onClick={() => setViewType('bookmarks')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg transition-all ${viewType === 'bookmarks' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}><Bookmark size={14} /> <span className="hidden sm:inline">북마크</span></button>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setViewType(viewType.includes('shorts') ? 'ranking_shorts' : 'ranking_longform')} className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-black rounded-xl transition-all border ${isRankingMode ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><Trophy size={14} /> <span className="hidden sm:inline">랭킹 보드</span></button>
            <button onClick={() => setIsModalOpen(true)} className="p-2 sm:p-2.5 bg-gray-900 hover:bg-black text-white rounded-xl active:scale-95 shadow-md shadow-gray-200"><Settings size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 sm:pt-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-black text-[10px] tracking-widest uppercase">Fetching Latest...</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter capitalize flex items-center gap-3">
                  {getViewTitle()}
                </h2>
                <p className="text-gray-400 text-[10px] font-black uppercase flex items-center gap-2 tracking-widest">
                  {lastUpdateTime && <><Clock size={12} /> Last Update: {new Date(lastUpdateTime).toLocaleTimeString()} {viewType.startsWith('mychannel') && '(최근 90일)'}</>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                {!isRankingMode && (
                  <div className="relative group mr-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={16} />
                    <input 
                      type="text"
                      placeholder="피드 내 검색..."
                      className="pl-11 pr-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all w-48 sm:w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
                
                <button onClick={handleUpdate} className="flex items-center gap-2 px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-red-100 active:scale-95"><RefreshCcw size={14} /> 업데이트</button>
                <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                  <button onClick={() => handleSortChange(SortOrder.LATEST)} className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentSortOrder === SortOrder.LATEST ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>최신순</button>
                  <button onClick={() => handleSortChange(SortOrder.POPULAR)} className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentSortOrder === SortOrder.POPULAR ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>조회수순</button>
                  <button onClick={() => handleSortChange(SortOrder.COMMENTS)} className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentSortOrder === SortOrder.COMMENTS ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>댓글순</button>
                  <button onClick={() => handleSortChange(SortOrder.DURATION)} className={`whitespace-nowrap px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentSortOrder === SortOrder.DURATION ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>런타임순</button>
                </div>
              </div>
            </div>

            {isRankingMode ? (
              <ChannelRankingTable channels={channels} />
            ) : (
              <>
                {filteredVideos.length > 0 ? (
                  <div className={`grid gap-x-6 gap-y-12 ${viewType.includes('shorts') ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {filteredVideos.map((video) => (
                      <VideoCard key={video.id} video={video} channel={channels.find(c => c.id === video.channelId)!} aspect={viewType.includes('shorts') ? 'shorts' : 'video'} onPreview={setPreviewVideoId} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-400 space-y-4">
                    <Search size={48} className="opacity-20" />
                    <p className="font-black text-sm uppercase tracking-widest">검색 결과가 없습니다</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* AI Analysis Result Modal */}
      {aiInsight && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
             <div className="p-8 border-b border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Sparkles size={24} /></div>
                 <h3 className="text-xl font-black text-gray-900">Gemini AI Insight</h3>
               </div>
               <button onClick={() => setAiInsight(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X /></button>
             </div>
             <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50 custom-scrollbar whitespace-pre-wrap leading-relaxed text-gray-700 font-medium">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                   <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Target Video</h4>
                   <p className="font-bold text-gray-900">{aiInsight.title}</p>
                </div>
                <div className="prose prose-slate">
                  {aiInsight.content}
                </div>
             </div>
             <div className="p-8 bg-white border-t border-gray-100">
               <button onClick={() => setAiInsight(null)} className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95">확인 완료</button>
             </div>
          </div>
        </div>
      )}

      {/* Analyzing Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-indigo-900/40 backdrop-blur-xl animate-in fade-in">
           <div className="relative">
             <div className="w-24 h-24 bg-white/20 rounded-full animate-ping absolute"></div>
             <div className="w-24 h-24 bg-white/10 rounded-full animate-pulse flex items-center justify-center border border-white/30 backdrop-blur-md">
                <Sparkles size={40} className="text-white animate-bounce" />
             </div>
           </div>
           <p className="mt-8 text-white font-black text-xl tracking-tight">Gemini가 영상을 분석 중입니다...</p>
           <p className="text-white/60 text-sm mt-2 font-bold">최적의 인사이트를 추출하고 있습니다.</p>
        </div>
      )}

      {previewVideoId && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
           <div className="w-full max-w-5xl flex justify-between items-center mb-6">
             <h3 className="text-white font-black text-lg">Preview Player</h3>
             <button onClick={() => setPreviewVideoId(null)} className="p-3 bg-red-600 text-white rounded-2xl"><X /></button>
           </div>
           <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10">
              <iframe src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`} className="w-full h-full" allowFullScreen></iframe>
           </div>
        </div>
      )}

      <RegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={syncFromCache} existingChannels={channels} />
    </div>
  );
};

export default App;
