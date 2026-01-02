
import { YouTubeVideo, ChannelInfo, SortOrder, AppSettings, ViewType } from '../types';

export interface SavedItem {
  video: YouTubeVideo;
  channel: ChannelInfo;
  savedAt: string;
}

export interface FeedCache {
  videos: YouTubeVideo[];
  channels: ChannelInfo[];
  updatedAt: string;
}

export class YouTubeService {
  private static STORAGE_KEY = 'yt_shorts_settings';
  private static SAVED_KEY = 'yt_saved_videos';
  private static FEED_CACHE_PREFIX = 'yt_feed_cache_';
  private static BASE_URL = 'https://www.googleapis.com/youtube/v3';

  static getSettings(): AppSettings {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const defaultSettings: AppSettings = { 
      apiKey: '', 
      shortsChannelUrls: [], 
      longformDramaUrls: [],
      longformYadamUrls: [],
      longformMusicUrls: [],
      longformChannelUrls: [], 
      myChannelUrls: [],
      interestedChannelIds: [] 
    };
    
    if (!saved) return defaultSettings;
    
    const parsed = JSON.parse(saved);
    
    // Legacy support
    if (parsed.channelUrls && !parsed.longformChannelUrls) {
      parsed.longformChannelUrls = parsed.channelUrls;
      parsed.shortsChannelUrls = [];
    }
    
    return { ...defaultSettings, ...parsed };
  }

  static saveSettings(
    apiKey: string, 
    shortsChannelUrls: string[], 
    longformDramaUrls: string[], 
    longformYadamUrls: string[], 
    longformMusicUrls: string[], 
    myChannelUrls: string[] = [], 
    interestedChannelIds: string[] = []
  ) {
    const config = { 
      apiKey, 
      shortsChannelUrls: shortsChannelUrls.map(u => u.trim()).filter(u => u !== ''),
      longformDramaUrls: longformDramaUrls.map(u => u.trim()).filter(u => u !== ''),
      longformYadamUrls: longformYadamUrls.map(u => u.trim()).filter(u => u !== ''),
      longformMusicUrls: longformMusicUrls.map(u => u.trim()).filter(u => u !== ''),
      longformChannelUrls: [], // Generic list is now split
      myChannelUrls: myChannelUrls.map(u => u.trim()).filter(u => u !== ''),
      interestedChannelIds 
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    return config;
  }

  static getFeedCache(type: ViewType): FeedCache | null {
    const cached = localStorage.getItem(this.FEED_CACHE_PREFIX + type);
    return cached ? JSON.parse(cached) : null;
  }

  static saveFeedCache(type: ViewType, data: { videos: YouTubeVideo[], channels: ChannelInfo[] }) {
    const cache: FeedCache = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.FEED_CACHE_PREFIX + type, JSON.stringify(cache));
    return cache;
  }

  static getSavedItems(): SavedItem[] {
    const saved = localStorage.getItem(this.SAVED_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  static setSavedItems(items: SavedItem[]) {
    localStorage.setItem(this.SAVED_KEY, JSON.stringify(items));
  }

  static toggleSaveVideo(video: YouTubeVideo, channel: ChannelInfo): boolean {
    const items = this.getSavedItems();
    const index = items.findIndex(item => item.video.id === video.id);
    
    if (index > -1) {
      items.splice(index, 1);
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(items));
      return false;
    } else {
      items.push({ video, channel, savedAt: new Date().toISOString() });
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(items));
      return true;
    }
  }

  static isVideoSaved(videoId: string): boolean {
    const items = this.getSavedItems();
    return items.some(item => item.video.id === videoId);
  }

  private static ISO8601ToSeconds(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }

  static formatDuration(duration: string | undefined): string {
    if (!duration) return "";
    const totalSeconds = this.ISO8601ToSeconds(duration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) {
      parts.push(hours.toString());
      parts.push(minutes.toString().padStart(2, '0'));
    } else {
      parts.push(minutes.toString());
    }
    parts.push(seconds.toString().padStart(2, '0'));

    return parts.join(':');
  }

  private static resolveIdentifier(url: string): { type: 'id' | 'handle' | 'custom', value: string } {
    const trimmed = url.trim();
    if (trimmed.startsWith('@')) return { type: 'handle', value: trimmed.substring(1) };
    const handleMatch = trimmed.match(/@([^/?#\s]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    const idMatch = trimmed.match(/channel\/([^/?#\s]+)/);
    if (idMatch) return { type: 'id', value: idMatch[1] };
    const cMatch = trimmed.match(/\/(?:c|user)\/([^/?#\s]+)/);
    if (cMatch) return { type: 'custom', value: cMatch[1] };
    return { type: 'handle', value: trimmed.replace(/https?:\/\/(www\.)?youtube\.com\//, '') };
  }

  static async fetchVideos(sort: SortOrder, type: ViewType): Promise<{ videos: YouTubeVideo[], channels: ChannelInfo[] }> {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const isMyChannel = type.startsWith('mychannel');
    
    if (type === 'bookmarks') {
      const saved = this.getSavedItems();
      let videos = saved.map(s => s.video);
      let channels = saved.map(s => s.channel);
      
      if (sort === SortOrder.LATEST) {
        videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } else {
        videos = videos
          .filter(v => new Date(v.publishedAt).getTime() >= ninetyDaysAgo)
          .sort((a, b) => b.viewCount - a.viewCount);
      }
      return { videos, channels };
    }

    const settings = this.getSettings();
    const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;

    let urls: string[] = [];
    if (type === 'shorts' || type === 'ranking_shorts') urls = settings.shortsChannelUrls;
    else if (type === 'longform_drama') urls = settings.longformDramaUrls;
    else if (type === 'longform_yadam') urls = settings.longformYadamUrls;
    else if (type === 'longform_music') urls = settings.longformMusicUrls;
    else if (type === 'longform' || type === 'ranking_longform') urls = settings.longformChannelUrls;
    else if (isMyChannel) urls = settings.myChannelUrls;

    if (!settings.apiKey) {
      const mockType = (type.includes('shorts')) ? 'shorts' : 'longform';
      return this.fetchMockData(urls, sort, settings.interestedChannelIds, mockType);
    }

    try {
      const allChannels: ChannelInfo[] = [];
      const channelIdToPlaylistId: Record<string, string> = {};
      const channelIdToInfo: Record<string, ChannelInfo> = {};

      for (const url of urls) {
        const ident = this.resolveIdentifier(url);
        let query = ident.type === 'handle' ? `forHandle=${ident.value}` : ident.type === 'id' ? `id=${ident.value}` : `forUsername=${ident.value}`;
        const chRes = await fetch(`${this.BASE_URL}/channels?part=snippet,statistics,contentDetails&${query}&key=${settings.apiKey}`);
        const chData = await chRes.json();

        if (chData.items?.[0]) {
          const item = chData.items[0];
          const chInfo: ChannelInfo = {
            id: item.id,
            title: item.snippet.title,
            subscriberCount: parseInt(item.statistics.subscriberCount),
            videoCount: parseInt(item.statistics.videoCount),
            totalViewCount: parseInt(item.statistics.viewCount),
            publishedAt: item.snippet.publishedAt,
            customUrl: item.snippet.customUrl || `@${item.snippet.title}`,
            thumbnail: item.snippet.thumbnails.default.url,
            isInterested: settings.interestedChannelIds.includes(item.id),
            recentCommentsCount: 0,
            recentShortsViews: 0,
            recentUploadCount: 0
          };
          allChannels.push(chInfo);
          channelIdToPlaylistId[item.id] = item.contentDetails.relatedPlaylists.uploads;
          channelIdToInfo[item.id] = chInfo;
        }
      }

      const tempVideos: YouTubeVideo[] = [];

      for (const chId in channelIdToPlaylistId) {
        let nextPageToken = '';
        let fetchedCount = 0;
        const maxFetch = isMyChannel ? 200 : 50; 

        do {
          const plRes = await fetch(`${this.BASE_URL}/playlistItems?part=snippet&playlistId=${channelIdToPlaylistId[chId]}&maxResults=50&pageToken=${nextPageToken}&key=${settings.apiKey}`);
          const plData = await plRes.json();
          
          if (plData.items && plData.items.length > 0) {
            const videoIds = plData.items.map((item: any) => item.snippet.resourceId.videoId);
            const vRes = await fetch(`${this.BASE_URL}/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(',')}&key=${settings.apiKey}`);
            const vData = await vRes.json();

            if (vData.items) {
              vData.items.forEach((item: any) => {
                const durationSec = this.ISO8601ToSeconds(item.contentDetails.duration);
                const isShorts = durationSec <= 60;
                const pubTime = new Date(item.snippet.publishedAt).getTime();

                if (type.includes('shorts') && !isShorts) return;
                if (type.includes('longform') && isShorts) return;
                
                if (isMyChannel && pubTime < ninetyDaysAgo) return;

                const video: YouTubeVideo = {
                  id: item.id,
                  title: item.snippet.title,
                  thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
                  viewCount: parseInt(item.statistics.viewCount),
                  commentCount: parseInt(item.statistics.commentCount || '0'),
                  publishedAt: item.snippet.publishedAt,
                  channelId: item.snippet.channelId,
                  channelTitle: item.snippet.channelTitle,
                  duration: item.contentDetails.duration
                };
                tempVideos.push(video);

                const info = channelIdToInfo[video.channelId];
                if (info) {
                  if (!info.latestUploadDate || pubTime > new Date(info.latestUploadDate).getTime()) info.latestUploadDate = video.publishedAt;
                  if (pubTime >= twentyEightDaysAgo) {
                    info.recentCommentsCount = (info.recentCommentsCount || 0) + video.commentCount;
                    info.recentShortsViews = (info.recentShortsViews || 0) + video.viewCount;
                    info.recentUploadCount = (info.recentUploadCount || 0) + 1;
                  }
                }
              });
            }
            
            fetchedCount += plData.items.length;
            nextPageToken = plData.nextPageToken;

            if (!isMyChannel) break;
            const lastItemPubTime = new Date(plData.items[plData.items.length-1].snippet.publishedAt).getTime();
            if (isMyChannel && lastItemPubTime < ninetyDaysAgo) break;

          } else {
            break;
          }
        } while (nextPageToken && fetchedCount < maxFetch);
      }

      let sorted = [...tempVideos];
      if (sort === SortOrder.LATEST) {
        sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } else if (sort === SortOrder.POPULAR) {
        sorted = sorted
          .filter(v => new Date(v.publishedAt).getTime() >= ninetyDaysAgo)
          .sort((a, b) => b.viewCount - a.viewCount);
      }

      return { videos: isMyChannel ? sorted : sorted.slice(0, 100), channels: allChannels };
    } catch (e) {
      console.error("YouTube fetch error:", e);
      return { videos: [], channels: [] };
    }
  }

  private static async fetchMockData(urls: string[], sort: SortOrder, interestedIds: string[], type: 'shorts' | 'longform') {
    const allVideos: YouTubeVideo[] = [];
    const channels: ChannelInfo[] = [];
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;

    const targetUrls = urls.length ? urls : ["Mock-Channel"];

    targetUrls.forEach((url, idx) => {
      const name = url.includes('@') ? url.split('@')[1] : (type === 'shorts' ? 'S-Ch-' : 'L-Ch-') + idx;
      const chId = `mock-${type}-${idx}`;
      const channel: ChannelInfo = {
        id: chId, title: name, subscriberCount: 5000 * (idx + 1), videoCount: 100, thumbnail: `https://picsum.photos/seed/${chId}/100/100`, customUrl: `@${name}`, isInterested: interestedIds.includes(chId), recentCommentsCount: 0, recentShortsViews: 0, recentUploadCount: 0
      };

      for (let i = 0; i < 40; i++) {
        const pubDate = new Date(Date.now() - i * 3 * 86400000);
        const duration = type === 'shorts' ? 'PT45S' : 'PT10M20S';
        const video: YouTubeVideo = {
          id: `${chId}-v-${i}`, title: `[샘플] ${name} 분석 영상 #${i}`, thumbnail: `https://picsum.photos/seed/${chId}-v-${i}/${type === 'shorts' ? '400/700' : '640/360'}`, viewCount: Math.floor(Math.random() * 1000000), commentCount: Math.floor(Math.random() * 5000), publishedAt: pubDate.toISOString(), channelId: chId, channelTitle: name, duration
        };
        allVideos.push(video);
        if (pubDate.getTime() >= twentyEightDaysAgo) {
          channel.recentShortsViews! += video.viewCount;
          channel.recentCommentsCount! += video.commentCount;
          channel.recentUploadCount! += 1;
        }
      }
      channels.push(channel);
    });

    let sorted = [...allVideos];
    if (sort === SortOrder.LATEST) {
      sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else {
      sorted = sorted.filter(v => new Date(v.publishedAt).getTime() > ninetyDaysAgo).sort((a, b) => b.viewCount - a.viewCount);
    }

    return { videos: sorted.slice(0, 100), channels };
  }

  static isToday(dateString: string): boolean {
    const today = new Date();
    const target = new Date(dateString);
    return today.getFullYear() === target.getFullYear() && today.getMonth() === target.getMonth() && today.getDate() === target.getDate();
  }

  static isRecent(dateString: string, days: number): boolean {
    const diff = Date.now() - new Date(dateString).getTime();
    return (diff / (1000 * 60 * 60 * 24)) <= days;
  }

  static formatViews(views: number): string {
    if (views >= 100000000) return (views / 100000000).toFixed(1) + '억';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + '백만';
    if (views >= 10000) return (views / 10000).toFixed(1) + '만';
    return views.toLocaleString();
  }

  static formatSubscribers(count: number): string {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}만명`;
    return `${count}명`;
  }

  static getRelativeTime(dateString: string): string {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    const days = Math.floor(diff / 86400);
    if (days < 7) return `${days}일 전`;
    const d = new Date(dateString);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  }

  static formatDateTime(dateString: string): string {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
