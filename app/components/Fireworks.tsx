'use client';

import React, { useEffect, useRef } from 'react';

const Fireworks = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cập nhật kích thước canvas theo màn hình
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Cấu hình vật lý
    const gravity = 0.04;
    const friction = 0.96;
    const particles: Particle[] = [];
    const fireworks: Firework[] = [];

    // Hàm tạo màu ngẫu nhiên rực rỡ
    const randomColor = () => {
      const colors = ['#ff0043', '#14fc56', '#1e7fff', '#e600ff', '#ffaa00', '#ffffff'];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    class Particle {
      x: number; y: number; vx: number; vy: number;
      color: string; alpha: number; decay: number; size: number;

      constructor(x: number, y: number, color: string, isSubParticle = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        // Tốc độ nổ (sub-particle bay chậm hơn)
        const speed = isSubParticle ? Math.random() * 3 : Math.random() * 8 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        // Tốc độ mờ dần (quyết định thời gian rơi)
        this.decay = Math.random() * 0.015 + 0.005;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.vx *= friction;
        this.vy *= friction;
        this.vy += gravity; // Rơi từ từ xuống
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
      }

      draw() {
        ctx!.save();
        ctx!.globalAlpha = this.alpha;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = this.color;
        ctx!.fill();
        ctx!.restore();
      }
    }

    class Firework {
      x: number; y: number; targetY: number; vy: number; color: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.targetY = Math.random() * (canvas.height / 2); // Bắn lên nửa trên màn hình
        this.vy = -(Math.random() * 4 + 8); // Vận tốc bắn lên
        this.color = randomColor();
      }

      update() {
        this.y += this.vy;
        this.vy += gravity * 0.5; // Chậm dần khi lên cao
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx!.fillStyle = this.color;
        ctx!.fill();
      }
    }

    const animate = () => {
      requestAnimationFrame(animate);
      // Tạo hiệu ứng vệt đuôi (trail) bằng cách không xóa hoàn toàn canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Thêm pháo hoa mới ngẫu nhiên
      if (Math.random() < 0.05) {
        fireworks.push(new Firework());
      }

      // Cập nhật và vẽ pháo hoa bay lên
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.update();
        fw.draw();

        // Khi pháo hoa đạt đỉnh hoặc vận tốc giảm, phát nổ
        if (fw.vy >= 0 || fw.y <= fw.targetY) {
          // Nổ ra nhiều hạt to
          for (let j = 0; j < 80; j++) {
            particles.push(new Particle(fw.x, fw.y, fw.color));
          }
          // Thêm một số hạt nổ phụ màu khác cho đa dạng
          for (let j = 0; j < 30; j++) {
            particles.push(new Particle(fw.x, fw.y, randomColor(), true));
          }
          fireworks.splice(i, 1);
        }
      }

      // Cập nhật và vẽ các hạt (particles)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }
    };

    animate();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 bg-black"
    />
  );
};

export default Fireworks;