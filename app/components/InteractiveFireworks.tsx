'use client';

import React, { useEffect, useRef, useState } from 'react';

// --- INTERFACES ---
interface Wish {
  sender: string;
  receiver: string; // <-- THÊM TRƯỜNG NGƯỜI NHẬN
  message: string;
}

interface Props {
  initialWishes: Wish[];
}

// --- CLASS DEFINITIONS ---

class Particle {
  x: number; y: number;
  coordinates: [number, number][];
  angle: number; speed: number; friction: number; gravity: number;
  hue: number; brightness: number; alpha: number; decay: number;

  constructor(x: number, y: number, hue: number) {
    this.x = x; this.y = y;
    this.coordinates = [];
    let coordinateCount = 15;
    while (coordinateCount--) { this.coordinates.push([this.x, this.y]); }
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 5 + 1;
    this.friction = 0.96;
    this.gravity = 0.06;
    this.hue = hue + (Math.random() * 20 - 10);
    this.brightness = Math.random() * 20 + 50;
    this.alpha = 1;
    this.decay = Math.random() * 0.007 + 0.002;
  }

  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    const lastCoord = this.coordinates[this.coordinates.length - 1];
    ctx.moveTo(lastCoord[0], lastCoord[1]);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

class Firework {
  x: number; y: number; sx: number; sy: number;
  tx: number; ty: number; distanceToTarget: number;
  coordinates: [number, number][];
  angle: number; speed: number; acceleration: number;
  hue: number;

  constructor(sx: number, sy: number, tx: number, ty: number) {
    this.x = sx; this.y = sy;
    this.sx = sx; this.sy = sy;
    this.tx = tx; this.ty = ty;
    this.distanceToTarget = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
    this.coordinates = [];
    let coordinateCount = 3;
    while (coordinateCount--) { this.coordinates.push([this.x, this.y]); }
    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = 1.5;
    this.acceleration = 1.03;
    this.hue = Math.random() * 360;
  }

  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.acceleration;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    const lastCoord = this.coordinates[this.coordinates.length - 1];
    ctx.moveTo(lastCoord[0], lastCoord[1]);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsl(${this.hue}, 100%, 60%)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

class FloatingText {
  x: number; y: number; wish: Wish; hue: number;
  life: number; maxLife: number; vy: number; scale: number;

  constructor(x: number, y: number, wish: Wish, hue: number) {
    this.x = x; this.y = y;
    this.wish = wish;
    this.hue = hue;
    this.life = 0;
    this.maxLife = 140;
    this.vy = -0.3;
    this.scale = 0.2;
  }

  update() {
    this.y += this.vy;
    this.life++;
    if (this.scale < 1) this.scale += 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    let currentAlpha = 1;
    if (this.life < 40) currentAlpha = this.life / 40;
    else if (this.life > this.maxLife - 30) currentAlpha = (this.maxLife - this.life) / 30;

    ctx.globalAlpha = Math.max(0, Math.min(currentAlpha, 1));
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.textAlign = "center";
    ctx.shadowBlur = window.innerWidth < 768 ? 10 : 15;
    ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;

    const isMobile = window.innerWidth < 768;
    const fontFamily = 'Roboto, sans-serif';
    const senderSize = isMobile ? "14px" : "16px";
    const messageSize = isMobile ? "20px" : "28px";
    const senderOffsetY = isMobile ? -18 : -25;

    // --- CẬP NHẬT CHỮ HIỂN THỊ (NGƯỜI GỬI - NGƯỜI NHẬN) ---
    ctx.font = `300 ${senderSize} ${fontFamily}`;
    ctx.fillStyle = `hsl(${this.hue}, 100%, 85%)`;
    ctx.fillText(`${this.wish.sender} chúc ${this.wish.receiver}`, 0, senderOffsetY);

    ctx.font = `600 ${messageSize} ${fontFamily}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${this.wish.message}`, 0, 5);

    ctx.restore();
  }
}

// --- MAIN COMPONENT ---

export default function InteractiveFireworks({ initialWishes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [wishes, setWishes] = useState<Wish[]>(initialWishes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Form states
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState(''); // Thêm state Người Nhận
  const [messages, setMessages] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState('');

  // 1. Nhạc nền cơ bản & Tương tác đầu tiên
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
      }
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, []);

  // 2. Form Handlers
  const handleMessageChange = (index: number, value: string) => {
    const newMsgs = [...messages];
    newMsgs[index] = value;
    setMessages(newMsgs);
  };
  const addMessageInput = () => setMessages([...messages, '']);
  const removeMessageInput = (index: number) => setMessages(messages.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const validMessages = messages.filter(m => m.trim() !== '');
    if (validMessages.length === 0) return setLoading(false);

    try {
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, receiver, messages: validMessages }), // Gửi kèm receiver
      });
      const data = await res.json();
      if (data.success) {
        setNewLink(`${window.location.origin}${data.link}`);
        // Cập nhật mảng wishes cục bộ
        const newWishes = validMessages.map(msg => ({ sender, receiver, message: msg }));
        setWishes(prev => [...prev, ...newWishes]);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // 3. Canvas Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const fireworks: Firework[] = [];
    const floatingTexts: FloatingText[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      const prob = window.innerWidth < 768 ? 0.03 : 0.05;

      if (Math.random() < prob) {
        const sx = Math.random() * canvas.width;
        const tx = sx + (Math.random() * 200 - 100);
        const ty = (canvas.height * 0.1) + Math.random() * (canvas.height * 0.5);
        fireworks.push(new Firework(sx, canvas.height, tx, ty));
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw(ctx);
        const fw = fireworks[i];
        const dist = Math.sqrt(Math.pow(fw.x - fw.sx, 2) + Math.pow(fw.y - fw.sy, 2));
        
        if (dist >= fw.distanceToTarget) {
          for (let j = 0; j < 60; j++) particles.push(new Particle(fw.tx, fw.ty, fw.hue));
          
          if (wishes.length > 0 && Math.random() < 0.4 && fw.tx > canvas.width * 0.15 && fw.tx < canvas.width * 0.85) {
            const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
            floatingTexts.push(new FloatingText(fw.tx, fw.ty, randomWish, fw.hue));
          }
          fireworks.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }

      ctx.globalCompositeOperation = 'source-over';
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        floatingTexts[i].draw(ctx);
        if (floatingTexts[i].life >= floatingTexts[i].maxLife) floatingTexts.splice(i, 1);
      }
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [wishes]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden z-0 font-roboto">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* City Background */}
      <div className="absolute bottom-0 left-0 w-full h-[15vh] md:h-[30vh] pointer-events-none z-10">
        <img src="/images/image.png" alt="Thành phố" className="w-full h-full object-cover md:object-contain object-bottom" />
        <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
        .font-tet { font-family: 'Pacifico', cursive; }
        .font-roboto { font-family: 'Roboto', sans-serif; }
        .neon-bktin { color: #f0f9ff; text-shadow: 0 0 2px #fff, 0 0 8px #3b82f6, 0 0 20px #2563eb; }
        .neon-chucmung { color: #fff; text-shadow: 0 0 5px #fff, 0 0 10px #06b6d4, 0 0 20px #0891b2; }
      `}</style>

      <audio ref={audioRef} src="/nhac_tet.mp3" loop />

      {/* Header UI */}
      <div className="absolute top-4 left-3 z-20 flex items-center gap-1 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500 blur-lg opacity-70 rounded-full animate-pulse"></div>
          <img src="/images/avatar-bktin.jpg" alt="Logo" className="relative w-10 h-10 md:w-14 md:h-14 bg-white rounded-full border-2 border-yellow-400 p-0.25" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-black text-white uppercase neon-bktin tracking-widest">BKTIN</h1>
          <p className="text-sm md:text-xl text-yellow-200 font-tet neon-chucmung">Chúc Mừng Năm Mới</p>
        </div>
      </div>

      {/* CỤM CONTROLS ĐÃ ĐƯỢC THIẾT KẾ LẠI ĐẸP MẮT HƠN */}
      <div className="absolute top-4 right-2 z-20 flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-black/30 backdrop-blur-md border border-white/10 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.15)]">
        
        {/* Nút Âm Nhạc */}
        <button 
          onClick={toggleMusic} 
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title={isPlaying ? "Tắt nhạc" : "Bật nhạc"}
        >
          {isPlaying ? (
            // Icon Loa đang phát nhạc (Có sóng âm)
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            // Icon Loa tắt nhạc (Có dấu X)
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor" 
              className="w-5 h-5 md:w-6 md:h-6 opacity-70 transition-transform duration-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </button>
        
        {/* Nút Tạo Lời Chúc */}
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-2 py-2 md:px-6 md:py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2"
        >
          {/* <span className="text-lg md:text-xl">✨</span> */}
          <span className="text-sm md:text-base">Gửi Lời Chúc</span>
          {/* <span className="text-sm sm:hidden">Tạo</span> */}
        </button>

      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-yellow-500/30 p-6 md:p-8 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto text-white shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                Gửi Lời Chúc Mới
              </h2>
              <button onClick={() => { setIsModalOpen(false); setNewLink(''); }} className="text-2xl text-white/50 hover:text-white transition-colors">✕</button>
            </div>

            {!newLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Khu vực Gửi & Nhận */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-yellow-500 font-bold mb-1 uppercase tracking-wider">Người gửi</label>
                    <input
                      type="text" placeholder="Tên của bạn" required value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl focus:border-yellow-500 focus:bg-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-yellow-500 font-bold mb-1 uppercase tracking-wider">Người nhận</label>
                    <input
                      type="text" placeholder="Tên người nhận" required value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl focus:border-yellow-500 focus:bg-black outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="h-px w-full bg-white/10 my-4"></div>

                {/* Khu vực Lời chúc */}
                <div>
                  <label className="block text-xs text-yellow-500 font-bold mb-2 uppercase tracking-wider">Nội dung lời chúc</label>
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text" placeholder={`Lời chúc ${idx + 1}`} required value={msg}
                          onChange={(e) => handleMessageChange(idx, e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl focus:border-yellow-500 focus:bg-black outline-none transition-all"
                        />
                        {messages.length > 1 && (
                          <button type="button" onClick={() => removeMessageInput(idx)} className="text-red-400 hover:bg-red-500/10 px-3 rounded-xl transition-colors">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={addMessageInput} className="text-yellow-500 text-sm font-medium hover:text-yellow-400 transition-colors inline-block mt-2">
                  + Thêm một lời chúc nữa
                </button>

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black rounded-xl mt-6 disabled:opacity-50 transition-all transform hover:-translate-y-1 shadow-lg">
                  {loading ? 'Đang khởi tạo...' : 'Bắt Đầu Bắn Pháo 🚀'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
                <div>
                  <p className="text-white font-semibold text-lg">Tuyệt vời!</p>
                  <p className="text-white/60 text-sm mt-1">Link của bạn đã sẵn sàng để gửi đi.</p>
                </div>
                <div className="p-3 bg-black/50 rounded-xl border border-white/10 break-all text-yellow-400 text-sm font-mono">
                  {newLink}
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(newLink); alert('Đã copy!'); }} 
                  className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                >
                  Sao Chép Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}