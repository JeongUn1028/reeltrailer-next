//* YouTube IFrame Player API 스크립트를 한 번만 로드하고 준비되면 YT 네임스페이스를 돌려준다.
//* 연속 재생(영상 종료 감지)을 위해 iframe 대신 API를 사용한다.
const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

let apiPromise: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API는 브라우저에서만 사용할 수 있습니다."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<typeof YT>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube API 초기화 실패"));
    };

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube API 스크립트를 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}
