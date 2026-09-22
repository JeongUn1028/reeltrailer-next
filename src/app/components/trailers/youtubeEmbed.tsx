export default function YouTubeEmbed({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;

  return (
    <div className="youtube-embed" style={{ width: "100%", height: "100%" }}>
      <iframe
        key={videoId}
        src={src}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        style={{ width: "100%", height: "100%", border: 0 }}
        allowFullScreen
      ></iframe>
    </div>
  );
}
