import React, { useEffect, useRef } from 'react';

export default function AnimatedBg({ phase }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Floating particles
    const particles = Array.from({ length: 60 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 2.5 + 0.5,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    // Cricket ball SVG paths (simplified circles with seam)
    const balls = Array.from({ length: 8 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 20 + 10,
      vx:    (Math.random() - 0.5) * 0.3,
      vy:    (Math.random() - 0.5) * 0.3,
      rot:   Math.random() * 360,
      vrot:  (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.06 + 0.02,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw cricket balls
      balls.forEach(b => {
        b.x   += b.vx; b.y += b.vy; b.rot += b.vrot;
        if (b.x < -50) b.x = canvas.width + 50;
        if (b.x > canvas.width + 50) b.x = -50;
        if (b.y < -50) b.y = canvas.height + 50;
        if (b.y > canvas.height + 50) b.y = -50;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate((b.rot * Math.PI) / 180);
        ctx.globalAlpha = b.alpha;

        // Ball circle
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Seam
        ctx.beginPath();
        ctx.arc(0, 0, b.r, -0.3, 0.3);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = b.r * 0.12;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, b.r, Math.PI - 0.3, Math.PI + 0.3);
        ctx.stroke();

        ctx.restore();
      });

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,200,66,${p.alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Pulsing glow based on phase
  const glowColor = phase === 'bidding' ? 'rgba(231,76,60,0.08)' : 'rgba(245,200,66,0.06)';

  return (
    <>
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${glowColor}, transparent 70%)`,
        transition: 'background 1s ease',
      }} />
    </>
  );
}
