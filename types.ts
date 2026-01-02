
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: number;
  commentCount: number; 
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  duration?: string;
  script?: string; 
}

export interface ChannelInfo {
  id: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  totalViewCount?: number; 
  publishedAt?: string;    
  thumbnail: string;
  customUrl: string;
  isInterested?: boolean;  
  recentCommentsCount?: number; 
  recentShortsViews?: number;
  latestUploadDate?: string;   
  recentUploadCount?: number;  
}

export interface AppSettings {
  apiKey: string;
  shortsChannelUrls: string[];
  longformDramaUrls: string[]; 
  longformYadamUrls: string[];
  longformMusicUrls: string[];
  longformChannelUrls: string[]; 
  myChannelUrls: string[];
  interestedChannelIds: string[]; 
}

export enum SortOrder {
  LATEST = 'date',
  POPULAR = 'viewCount'
}

export type ViewType = 
  | 'longform' 
  | 'longform_drama' 
  | 'longform_yadam' 
  | 'longform_music' 
  | 'shorts' 
  | 'ranking_shorts' 
  | 'ranking_longform' 
  | 'mychannel_longform' 
  | 'mychannel_shorts' 
  | 'bookmarks';
