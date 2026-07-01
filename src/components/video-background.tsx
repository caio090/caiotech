"use client";
import { useEffect, useRef } from "react";

interface Props {
  src: string;
  poster?: string;
  playbackRate?: number;
  className?: string;
}

export function VideoBackground({ src, poster, playbackRate = 1, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function applyRate() {
      video!.playbackRate = playbackRate;
    }
    video.addEventListener("loadedmetadata", applyRate);
    applyRate();
    video.play().catch(() => {});
    return () => video.removeEventListener("loadedmetadata", applyRate);
  }, [playbackRate]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      controlsList="nodownload nofullscreen noremoteplayback"
      poster={poster}
      className={className}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
