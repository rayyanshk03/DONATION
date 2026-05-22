import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  phase: number;
  speed: number;
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let stars: Star[] = [];

    const buildStars = (w: number, h: number) => {
      stars = [];
      // Dense starfield: ~1 star per 800px²
      const count = Math.floor((w * h) / 800);
      for (let i = 0; i < count; i++) {
        // Most stars are tiny pinpoints; a few are slightly larger
        const r = Math.random();
        let radius: number;
        if (r < 0.70) radius = 0.3 + Math.random() * 0.4;       // tiny
        else if (r < 0.92) radius = 0.7 + Math.random() * 0.5;  // medium
        else radius = 1.2 + Math.random() * 0.6;                 // bright

        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius,
          opacity: 0.3 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 1.1,
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
      buildStars(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      animId = requestAnimationFrame(draw);
      t += 0.012;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        // Natural twinkle: slow sinusoidal opacity
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const alpha = s.opacity * (0.4 + 0.6 * twinkle);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);

        // Glow for brighter stars
        if (s.radius > 1.0) {
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 4);
          grd.addColorStop(0, `rgba(220, 230, 255, ${alpha})`);
          grd.addColorStop(0.4, `rgba(200, 215, 255, ${alpha * 0.4})`);
          grd.addColorStop(1, `rgba(180, 200, 255, 0)`);

          // Draw soft glow halo first
          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
          ctx.restore();
        }

        // Draw the star core
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        // White to very pale blue-white
        ctx.fillStyle = `rgba(210, 225, 255, ${alpha})`;
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
