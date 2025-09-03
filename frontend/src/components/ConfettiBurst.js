import React, { useEffect, useRef } from 'react';

const ConfettiBurst = ({ run, durationMs = 4000, onDone }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!run) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', onResize);

    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#22D3EE'];

    const count = Math.min(220, Math.floor((width * height) / 15000));

    const pieces = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      r: Math.random() * Math.PI,
      rs: (Math.random() - 0.5) * 0.2,
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 3,
      g: 0.03 + Math.random() * 0.05,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.9 + Math.random() * 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let p of pieces) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.rs;

        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;
        if (p.y > height + 50) {
          p.y = -50;
          p.vy = 2 + Math.random() * 3;
          p.vx = -2 + Math.random() * 4;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    timeoutRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, width, height);
      window.removeEventListener('resize', onResize);
      if (onDone) onDone();
    }, durationMs);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timeoutRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [run, durationMs, onDone]);

  return (
    <div className={`fixed inset-0 pointer-events-none ${run ? '' : 'hidden'}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default ConfettiBurst;
