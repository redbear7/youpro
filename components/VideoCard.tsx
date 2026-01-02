
import React, { useState, useEffect } from 'react';
import { YouTubeVideo, ChannelInfo } from '../types';
import { YouTubeService } from '../services/youtubeService';
import { Play, Check, Star, BookOpen, Eye, MessageCircle, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react';

interface VideoCardProps {
  video: YouTubeVideo;
  channel: ChannelInfo;
  aspect?: 'video' | 'shorts';
  onPreview: (videoId: string) => void;
  onSavedChange?: () => void;
  onAnalyze?: (video: YouTubeVideo) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, channel, aspect = 'shorts', onPreview, onSavedChange, onAnalyze }) => {
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [isGeminiCopied, setIsGeminiCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    setIsSaved(YouTubeService.isVideoSaved(video.id));
  }, [video.id]);

  const isHighViews = video.viewCount >= 1000000;
  const isMediumViews = video.viewCount >= 500000;
  const isNoteworthy = video.viewCount >= 100000;
  const isNew = YouTubeService.isToday(video.publishedAt);
  const isHighlightedRecent = YouTubeService.isRecent(video.publishedAt, 2);
  
  const isInterested = channel?.isInterested;
  const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(videoUrl, '_blank');
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowSaved = YouTubeService.toggleSaveVideo(video, channel);
    setIsSaved(nowSaved);
    if (onSavedChange) onSavedChange();
  };

  const handleNotebookLMLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(videoUrl);
    setIsUrlCopied(true);
    setTimeout(() => {
      setIsUrlCopied(false);
      window.open('https://notebooklm.google.com/', '_blank');
    }, 800);
  };

  const handleGeminiAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 유튜브 링크를 메모리에 복사
    navigator.clipboard.writeText(videoUrl);
    setIsGeminiCopied(true);
    
    // 0.8초 후 지정된 Gemini Gem 링크로 이동
    setTimeout(() => {
      setIsGeminiCopied(false);
      window.open('https://gemini.google.com/gem/cb510d1ced62', '_blank');
    }, 800);
  };

  const getBadgeBg = () => {
    if (video.viewCount >= 1000000) return 'bg-blue-600 border-blue-400';
    if (video.viewCount >= 500000) return 'bg-yellow-400 border-yellow-200';
    if (video.viewCount >= 100000) return 'bg-red-600 border-red-400';
    return 'bg-black/40 backdrop-blur-md border-white/20';
  };

  const getTextColor = () => {
    if (video.viewCount >= 500000 && video.viewCount < 1000000) return 'text-red-600';
    return 'text-white';
  };

  return (
    <div className="group flex flex-col bg-transparent">
      {/* Thumbnail Area */}
      <div 
        className={`relative ${aspect === 'video' ? 'aspect-video' : 'aspect-[9/16]'} cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl bg-gray-200 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500`}
        onClick={handleOpenOriginal}
      >
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000" />
        
        {/* Transparent Play Overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
           <div className="bg-white/10 backdrop-blur-[2px] p-5 rounded-full border-2 border-white/40 scale-75 group-hover:scale-100 transition-all duration-300">
             <Play className="text-white fill-white/20" size={28} />
           </div>
        </div>

        {/* Save Toggle */}
        <button 
          onClick={handleToggleSave}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-20 p-2 sm:p-2.5 rounded-xl border transition-all active:scale-90 shadow-lg ${isSaved ? 'bg-amber-500 border-amber-400 text-white' : 'bg-black/40 border-white/20 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100'}`}
        >
          {isSaved ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
        </button>

        {/* Status Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          {isNew && (
            <div className="bg-red-600 text-yellow-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[12px] font-black shadow-lg border-2 border-red-500 tracking-tighter animate-pulse">
              NEW
            </div>
          )}
        </div>
        
        {/* Stats Badges Stack */}
        <div className="absolute top-14 sm:top-16 right-2 sm:right-3 z-10 flex flex-col gap-1 items-end">
          <div className={`flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border font-black shadow-xl ${getBadgeBg()} ${getTextColor()}`}>
            <Eye size={10} className="sm:w-3 sm:h-3" />
            <span className="text-[10px] sm:text-[11px] leading-none uppercase tracking-tighter">{YouTubeService.formatViews(video.viewCount)}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/20 bg-black/60 backdrop-blur-md text-white font-black shadow-xl">
            <MessageCircle size={10} className="sm:w-3 sm:h-3" />
            <span className="text-[10px] sm:text-[11px] leading-none uppercase tracking-tighter">{video.commentCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Precise Date-Time Label */}
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 z-10">
          <span className="bg-black/60 backdrop-blur-md text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black border border-white/10 shadow-sm">
            {YouTubeService.formatDateTime(video.publishedAt)}
          </span>
        </div>

        {/* Time Labels Stack */}
        <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex flex-col items-end gap-1.5">
           {video.duration && (
             <span className="bg-red-600 text-white px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black border border-red-500 shadow-lg">
               {YouTubeService.formatDuration(video.duration)}
             </span>
           )}
           <span className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black border transition-all ${
             isHighlightedRecent 
              ? 'bg-yellow-400 text-red-600 border-yellow-500 shadow-lg shadow-yellow-200/50' 
              : 'bg-black/70 backdrop-blur-md text-white border-white/10'
           }`}>
            {YouTubeService.getRelativeTime(video.publishedAt)}
           </span>
        </div>
      </div>

      {/* Info Area */}
      <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 px-1">
        <h3 
          className={`text-[12px] sm:text-sm font-bold line-clamp-2 leading-snug h-8 sm:h-10 transition-colors cursor-pointer hover:underline
            ${isHighViews ? 'text-blue-600' : isMediumViews ? 'text-orange-600' : isNoteworthy ? 'text-red-600' : 'text-gray-800'}`}
          onClick={handleOpenOriginal}
        >
          {isHighViews ? '💎 ' : isMediumViews ? '🔥 ' : ''}{video.title}
        </h3>

        {/* Action Buttons - Split into 2 columns */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={handleNotebookLMLink}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg sm:rounded-xl text-[10px] font-black transition-all active:scale-[0.98] border shadow-sm
              ${isUrlCopied 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600'}`}
          >
            {isUrlCopied ? <Check size={12} /> : <BookOpen size={12} className="text-blue-500" />}
            Notebook
          </button>
          <button
            onClick={handleGeminiAction}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg sm:rounded-xl text-[10px] font-black transition-all active:scale-[0.98] border shadow-sm
              ${isGeminiCopied 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600'}`}
          >
            {isGeminiCopied ? <Check size={12} /> : <Sparkles size={12} className="text-indigo-500" />}
            {isGeminiCopied ? 'URL 복사됨' : 'Gemini AI'}
          </button>
        </div>
        
        {/* Channel Info Row */}
        <div className="flex items-center gap-2 sm:gap-3 pt-1 border-t border-gray-50 mt-1 sm:mt-2">
          <div className="relative shrink-0">
            <img 
              src={channel?.thumbnail || `https://picsum.photos/seed/${video.channelTitle}/100/100`} 
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-gray-100 shadow-sm ${isInterested ? 'ring-2 ring-yellow-400' : ''}`} 
              alt="" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 truncate flex items-center gap-0.5 sm:gap-1">
              {video.channelTitle}
              {isInterested && <Star size={8} className="text-yellow-500" fill="currentColor" />}
            </span>
            <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium leading-none">
              {YouTubeService.formatSubscribers(channel?.subscriberCount || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
