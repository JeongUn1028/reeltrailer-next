//* YouTube IFrame Player API 중 이 프로젝트에서 쓰는 최소 타입 (https://developers.google.com/youtube/iframe_api_reference)
declare namespace YT {
  interface PlayerVars {
    autoplay?: 0 | 1;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    mute?: 0 | 1;
  }
  interface OnStateChangeEvent {
    data: number;
  }
  interface PlayerOptions {
    videoId: string;
    host?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: () => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
    };
  }
  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    loadVideoById(videoId: string): void;
    destroy(): void;
  }
  const PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
