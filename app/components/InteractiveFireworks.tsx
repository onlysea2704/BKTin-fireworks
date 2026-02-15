'use client';

import React, { useEffect, useRef, useState } from 'react';

// --- INTERFACES ---
interface Wish {
  sender: string;
  message: string;
}

interface Props {
  initialWishes: Wish[];
}

// --- CLASS DEFINITIONS (DI CHUYỂN RA NGOÀI ĐỂ VERCEL KHÔNG BÁO LỖI) ---

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
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    const senderSize = isMobile ? "14px" : "18px";
    const messageSize = isMobile ? "20px" : "28px";
    const senderOffsetY = isMobile ? -18 : -25;

    ctx.font = `200 ${senderSize} ${fontFamily}`;
    ctx.fillStyle = `hsl(${this.hue}, 100%, 85%)`;
    ctx.fillText(this.wish.sender + " chúc bạn", 0, senderOffsetY);

    ctx.font = `400 ${messageSize} ${fontFamily}`;
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

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const isAudioInitialized = useRef(false);

  // Form states
  const [sender, setSender] = useState('');
  const [messages, setMessages] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState('');

  // 1. Audio Initialization & Global Interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!isAudioInitialized.current && audioRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        isAudioInitialized.current = true;
      }
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      if (audioRef.current?.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
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
        body: JSON.stringify({ sender, messages: validMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLink(`${window.location.origin}${data.link}`);
        const newWishes = validMessages.map(msg => ({ sender, message: msg }));
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

      // Phân tích âm thanh để quyết định mật độ bắn
      let volume = 0;
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        volume = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      }

      let prob = window.innerWidth < 768 ? 0.005 : 0.01;
      if (volume > 80) prob = 0.06;
      if (volume > 110) prob = 0.15;

      if (Math.random() < prob) {
        const sx = Math.random() * canvas.width;
        const tx = sx + (Math.random() * 200 - 100);
        const ty = (canvas.height * 0.2) + Math.random() * (canvas.height * 0.4);
        fireworks.push(new Firework(sx, canvas.height, tx, ty));
      }

      // Update & Draw
      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw(ctx);
        const fw = fireworks[i];
        const dist = Math.sqrt(Math.pow(fw.x - fw.sx, 2) + Math.pow(fw.y - fw.sy, 2));
        if (dist >= fw.distanceToTarget) {
          for (let j = 0; j < 60; j++) particles.push(new Particle(fw.tx, fw.ty, fw.hue));
          if (wishes.length > 0 && Math.random() < 0.3 && fw.tx > canvas.width * 0.2 && fw.tx < canvas.width * 0.8) {
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
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden z-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* City Background */}
      <div className="absolute bottom-0 left-0 w-full h-[15vh] md:h-[30vh] pointer-events-none z-10">
        <img src="/images/image.png" alt="Thành phố" className="w-full h-full object-cover md:object-contain object-bottom" />
        <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
        .font-tet { font-family: 'Pacifico', cursive; }
        .neon-bktin { color: #f0f9ff; text-shadow: 0 0 2px #fff, 0 0 8px #3b82f6, 0 0 20px #2563eb; }
        .neon-chucmung { color: #fff; text-shadow: 0 0 5px #fff, 0 0 10px #06b6d4, 0 0 20px #0891b2; }
      `}</style>

      <audio ref={audioRef} src="/nhac_tet.mp3" loop />

      {/* Header UI */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500 blur-lg opacity-70 rounded-full animate-pulse"></div>
          <img src="/images/avatar-bktin.jpg" alt="Logo" className="relative w-10 h-10 md:w-14 md:h-14 bg-white rounded-full border-2 border-yellow-400" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-black text-white uppercase neon-bktin tracking-widest">BKTIN</h1>
          <p className="text-sm md:text-xl text-yellow-200 font-tet neon-chucmung">Chúc Mừng Năm Mới</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={toggleMusic} className="w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur border border-white/20 rounded-full text-lg">
          {isPlaying ? '🔊' : '🔇'}
        </button>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full transition-all text-sm md:text-base">
          ✨ Tạo Lời Chúc
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-yellow-500/30 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-yellow-400">Gửi Lời Chúc Năm Mới</h2>
              <button onClick={() => { setIsModalOpen(false); setNewLink(''); }} className="text-2xl opacity-50 hover:opacity-100">✕</button>
            </div>

            {!newLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text" placeholder="Tên của bạn" required value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-white/20 rounded-lg focus:border-yellow-500 outline-none"
                />
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text" placeholder={`Lời chúc ${idx + 1}`} required value={msg}
                      onChange={(e) => handleMessageChange(idx, e.target.value)}
                      className="flex-1 px-4 py-2 bg-black border border-white/20 rounded-lg focus:border-yellow-500 outline-none"
                    />
                    {messages.length > 1 && (
                      <button type="button" onClick={() => removeMessageInput(idx)} className="text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addMessageInput} className="text-yellow-500 text-sm font-medium">+ Thêm lời chúc</button>
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold rounded-lg mt-4 disabled:opacity-50">
                  {loading ? 'Đang tạo...' : 'Bắt Đầu Bắn Pháo 🚀'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-green-400">✨ Tuyệt vời! Link của bạn đã sẵn sàng:</p>
                <div className="p-3 bg-black rounded border border-white/10 break-all text-yellow-200 text-sm">{newLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(newLink); alert('Đã copy!'); }} className="w-full py-3 bg-white/10 rounded-lg font-bold">Copy Link</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}