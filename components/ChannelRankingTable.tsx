
import React, { useState } from 'react';
import { ChannelInfo } from '../types';
import { YouTubeService } from '../services/youtubeService';
import { ArrowUpDown, Users, MessageSquare, Eye, ExternalLink, Star } from 'lucide-react';

interface ChannelRankingTableProps {
  channels: ChannelInfo[];
}

type SortKey = 'subscriberCount' | 'recentCommentsCount' | 'recentShortsViews';

const ChannelRankingTable: React.FC<ChannelRankingTableProps> = ({ channels }) => {
  const [sortKey, setSortKey] = useState<SortKey>('recentShortsViews');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedChannels = [...channels].sort((a, b) => {
    let valA = (a as any)[sortKey] || 0;
    let valB = (b as any)[sortKey] || 0;

    return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  const headers = [
    { label: '채널 정보', key: 'title', icon: null, sortable: false },
    { label: '최근 28일 조회수', key: 'recentShortsViews', icon: <Eye size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" /> },
    { label: '구독자', key: 'subscriberCount', icon: <Users size={12} className="sm:w-3.5 sm:h-3.5" /> },
    { label: '댓글', key: 'recentCommentsCount', icon: <MessageSquare size={12} className="sm:w-3.5 sm:h-3.5" /> },
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 sm:px-8 py-4 sm:py-6 text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">순위</th>
              {headers.map((h) => (
                <th 
                  key={h.key}
                  className={`px-4 sm:px-6 py-4 sm:py-6 text-[9px] sm:text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 ${h.sortable !== false ? 'cursor-pointer hover:text-red-600 transition-colors' : ''}`}
                  onClick={() => h.sortable !== false && handleSort(h.key as SortKey)}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {h.icon}
                    <span className={sortKey === h.key ? 'text-gray-900' : ''}>{h.label}</span>
                    {h.sortable !== false && <ArrowUpDown size={10} className={sortKey === h.key ? 'text-red-600' : 'text-gray-300 sm:w-3 sm:h-3'} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedChannels.map((channel, index) => (
              <tr key={channel.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-4 sm:px-8 py-4 sm:py-6">
                  <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-black ${index < 3 ? 'bg-red-50 text-red-600' : 'text-gray-400'}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative shrink-0">
                      <img src={channel.thumbnail} className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl border border-gray-100 ${channel.isInterested ? 'ring-2 ring-yellow-400' : ''}`} alt="" />
                      {channel.isInterested && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white p-0.5 rounded-md sm:rounded-lg">
                          <Star size={8} fill="currentColor" className="sm:w-2.5 sm:h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[12px] sm:text-sm font-black text-gray-900 leading-tight group-hover:text-red-600 transition-colors truncate max-w-[120px] sm:max-w-none ${channel.isInterested ? 'font-black' : 'font-semibold'}`}>
                        {channel.title}
                      </span>
                      <span className="text-[9px] sm:text-[11px] text-gray-400 font-medium truncate max-w-[100px] sm:max-w-none">{channel.customUrl}</span>
                    </div>
                    <a 
                      href={`https://www.youtube.com/${channel.customUrl}`} 
                      target="_blank" 
                      className="opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-all ml-1"
                    >
                      <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-6">
                  <span className="text-xs sm:text-sm font-black text-red-600 bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-red-100">
                    {YouTubeService.formatViews(channel.recentShortsViews || 0)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-6">
                  <span className="text-xs sm:text-sm font-bold text-gray-800">{YouTubeService.formatSubscribers(channel.subscriberCount)}</span>
                </td>
                <td className="px-4 sm:px-6 py-4 sm:py-6">
                  <span className="text-xs sm:text-sm font-medium text-gray-500">
                    {channel.recentCommentsCount?.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChannelRankingTable;
