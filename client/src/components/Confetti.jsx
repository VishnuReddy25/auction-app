import React, { useEffect, useRef } from 'react';

const COLORS = ['#f5c842','#2ecc71','#3b82f6','#e74c3c','#e05a2b','#fff','#a855f7'];

export default function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const pieces    = useRef([]);

  useEffect(() => {
    if (!active) { cancelAnimationFrame(animRef.current); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn pieces
    pieces.current = Array.from({ length: 180 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height - canvas.height,
      w:    Math.random() * 12 + 5,
      h:    Math.random() * 6  + 3,
      color:COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:   (Math.random() - 0.5) * 4,
      vy:   Math.random() * 5 + 3,
      rot:  Math.random() * 360,
      vrot: (Math.random() - 0.5) * 8,
      opacity: 1,
    }));

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      pieces.current.forEach(p => {
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.vrot;
        p.vy  += 0.12; // gravity
        if (frame > 120) p.opacity = Math.max(0, p.opacity - 0.015);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      pieces.current = pieces.current.filter(p => p.opacity > 0 && p.y < canvas.height + 50);

      if (pieces.current.length > 0) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ position:'fixed', inset:0, zIndex:9999, pointerEvents:'none' }}
    />
  );
}
