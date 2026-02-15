'use client';

import React, { useEffect, useRef } from 'react';

// --- DI CHUYỂN CLASS RA NGOÀI COMPONENT ---

class Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; alpha: number; decay: number; size: number;

  constructor(x: number, y: number, color: string, isSubParticle = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = isSubParticle ? Math.random() * 3 : Math.random() * 8 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.005;
    this.size = Math.random() * 2 + 1;
  }

  update(friction: number, gravity: number) {
    this.vx *= friction;
    this.vy *= friction;
    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

class Firework {
  x: number; y: number; targetY: number; vy: number; color: string;

  constructor(width: number, height: number, color: string) {
    this.x = Math.random() * width;
    this.y = height;
    this.targetY = Math.random() * (height / 2);
    this.vy = -(Math.random() * 4 + 8);
    this.color = color;
  }

  update(gravity: number) {
    this.y += this.vy;
    this.vy += gravity * 0.5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

const Fireworks = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const gravity = 0.04;
    const friction = 0.96;
    const particles: Particle[] = [];
    const fireworks: Firework[] = [];

    const randomColor = () => {
      const colors = ['#ff0043', '#14fc56', '#1e7fff', '#e600ff', '#ffaa00', '#ffffff'];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.05) {
        fireworks.push(new Firework(canvas.width, canvas.height, randomColor()));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.update(gravity);
        fw.draw(ctx);

        if (fw.vy >= 0 || fw.y <= fw.targetY) {
          for (let j = 0; j < 80; j++) {
            particles.push(new Particle(fw.x, fw.y, fw.color));
          }
          for (let j = 0; j < 30; j++) {
            particles.push(new Particle(fw.x, fw.y, randomColor(), true));
          }
          fireworks.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(friction, gravity);
        p.draw(ctx);
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }
    };

    animate();

    // --- CLEANUP ĐỂ TRÁNH RÒ RỈ BỘ NHỚ ---
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 bg-black"
    />
  );
};

export default Fireworks;