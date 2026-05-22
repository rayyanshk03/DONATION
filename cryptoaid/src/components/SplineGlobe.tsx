import React, { useState } from "react";

/**
 * SplineGlobe — embeds the Spline 3D Earth via iframe.
 * The iframe runs in a completely SEPARATE browser process (out-of-process iframe),
 * so WebGL shader compilation NEVER blocks the main page thread.
 * This is the same embed approach used on Spline's own website.
 */
export default function SplineGlobe() {
  const [loaded, setLoaded] = useState(false);

  // Spline public embed URL — converted from scene URL hash
  // scene: https://prod.spline.design/rGWRvwzQMFkkucaL/scene.splinecode
  // embed: https://my.spline.design/rGWRvwzQMFkkucaL/
  const EMBED_URL = "https://my.spline.design/rGWRvwzQMFkkucaL/";

  return (
    <div className="relative w-full h-full">
      {/* Fade-in overlay while Spline loads */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="relative">
            <div className="h-32 w-32 rounded-full border border-blue-500/20 animate-ping absolute inset-0" />
            <div className="h-32 w-32 rounded-full border border-cyan-500/30 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Spline iframe — runs in separate OS process, zero main-thread impact */}
      <iframe
        src={EMBED_URL}
        onLoad={() => setLoaded(true)}
        frameBorder="0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "transparent",
          opacity: loaded ? 1 : 0,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
        }}
        title="Interactive 3D Earth Globe"
        loading="lazy"
      />
    </div>
  );
}
