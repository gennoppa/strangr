import { useEffect, useRef } from 'react';

export default function VideoTile({ stream, muted = false, mirrored = false, className = '', children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={`video-tile ${className}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`${mirrored ? 'mirrored' : ''} ${stream ? 'has-stream' : ''}`}
      />
      {children}
    </div>
  );
}
