'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Wish {
  sender: string;
  message: string;
}

interface Props {
  initialWishes: Wish[];
}

export default function InteractiveFireworks({ initialWishes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wishes, setWishes] = useState<Wish[]>(initialWishes);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State Form dạng mảng
  const [sender, setSender] = useState('');
  const [messages, setMessages] = useState<string[]>(['']); // Bắt đầu với 1 ô input
  const [loading, setLoading] = useState(false);
  const [newLink, setNewLink] = useState('');

  // ... (GIỮ NGUYÊN TOÀN BỘ PHẦN LOGIC CANVAS `useEffect` Ở ĐÂY NHƯ CŨ) ...
  // Để code gọn, tôi không in lại phần class Particle, Firework, FloatingText. Bạn giữ nguyên phần đó nhé!

  // Lắng nghe tương tác đầu tiên để bật nhạc VÀ khởi tạo bộ phân tích âm thanh
  useEffect(() => {
    const handleFirstInteraction = () => {
      // 1. Khởi tạo bộ phân tích âm thanh nếu chưa có
      if (!isAudioInitialized.current && audioRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256; // Kích thước lấy mẫu âm thanh
        analyserRef.current = analyser;
        // Kết nối thẻ <audio> với bộ phân tích, rồi xuất ra loa
        const source = audioCtx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        isAudioInitialized.current = true;
      }
      // Đánh thức Audio Context nếu nó đang ngủ
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      // 2. Phát nhạc
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(err => console.log("Trình duyệt chặn nhạc:", err));
        setIsPlaying(true);
      }
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const handleMessageChange = (index: number, value: string) => {
    const newMsgs = [...messages];
    newMsgs[index] = value;
    setMessages(newMsgs);
  };

  const addMessageInput = () => {
    setMessages([...messages, '']);
  };

  const removeMessageInput = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validMessages = messages.filter(m => m.trim() !== '');
    if (validMessages.length === 0) return setLoading(false);

    const res = await fetch('/api/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, messages: validMessages }),
    });

    const data = await res.json();
    if (data.success) {
      setNewLink(`${window.location.origin}${data.link}`);

      // Thêm các lời chúc mới vào state để bắn pháo hoa
      const newWishes = validMessages.map(msg => ({ sender, message: msg }));
      setWishes(prev => [...prev, ...newWishes]);
    }
    setLoading(false);
  };

  // Xử lý Canvas và Pháo hoa
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particles: Particle[] = [];
    const fireworks: Firework[] = [];
    const floatingTexts: FloatingText[] = [];

    // 1. Lớp Hạt pháo hoa (Chỉnh nổ lâu hơn, chậm hơn, vệt lửa rơi dài đẹp)
    class Particle {
      x: number; y: number;
      coordinates: [number, number][];
      angle: number; speed: number; friction: number; gravity: number;
      hue: number; brightness: number; alpha: number; decay: number;

      constructor(x: number, y: number, hue: number) {
        this.x = x; this.y = y;
        this.coordinates = [];
        // Tăng độ dài của vệt lửa lên 10 (thay vì 5) để đuôi dài và mượt hơn
        let coordinateCount = 15;
        while (coordinateCount--) {
          this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.random() * Math.PI * 2;
        // Giảm tốc độ văng ra (từ 8 xuống 5) để pháo nổ chậm rãi
        this.speed = Math.random() * 5 + 1;
        this.friction = 0.96; // Lực cản không khí
        this.gravity = 0.06; // Tăng nhẹ trọng lực để hạt rơi rõ rệt thành vệt cong xuống
        this.hue = hue + (Math.random() * 20 - 10);
        this.brightness = Math.random() * 20 + 50;
        this.alpha = 1;
        // Giảm tốc độ mờ dần (từ 0.015 xuống 0.008) để hạt tồn tại lâu hơn trên không
        this.decay = Math.random() * 0.007 + 0.002;
      }

      update(index: number) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
        if (this.alpha <= 0) particles.splice(index, 1);
      }

      draw() {
        ctx!.beginPath();
        const lastCoord = this.coordinates[this.coordinates.length - 1];
        ctx!.moveTo(lastCoord[0], lastCoord[1]);
        ctx!.lineTo(this.x, this.y);
        ctx!.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        // Vẽ vệt lửa dày hơn một chút
        ctx!.lineWidth = 2.5;
        ctx!.stroke();
      }
    }

    // 2. Lớp Viên pháo bay lên (Chỉnh bay chậm lại)
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
        while (coordinateCount--) {
          this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.atan2(ty - sy, tx - sx);
        this.speed = 1.5; // Giảm tốc độ ban đầu (từ 2 xuống 1.5)
        this.acceleration = 1.03; // Giảm gia tốc (từ 1.05 xuống 1.03) để bay từ từ
        this.hue = Math.random() * 360;
      }

      update(index: number) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.acceleration;
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        this.x += vx;
        this.y += vy;

        const distanceTraveled = Math.sqrt(Math.pow(this.x - this.sx, 2) + Math.pow(this.y - this.sy, 2));
        if (distanceTraveled >= this.distanceToTarget) {
          for (let i = 0; i < 60; i++) {
            particles.push(new Particle(this.tx, this.ty, this.hue));
          }

          // Tính toán xem tọa độ nổ (tx) có nằm ở khoảng 30% đến 70% chiều rộng màn hình (khu vực giữa) không
          const isMiddleArea = this.tx > canvas.width * 0.2 && this.tx < canvas.width * 0.8;

          // Chỉ hiện lời chúc khi pháo nổ ở giữa VÀ thỏa mãn xác suất 20%
          if (wishes.length > 0 && Math.random() < 0.3 && isMiddleArea) {
            const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
            floatingTexts.push(new FloatingText(this.tx, this.ty, randomWish, this.hue));
          }
          fireworks.splice(index, 1);
        }
      }

      draw() {
        ctx!.beginPath();
        const lastCoord = this.coordinates[this.coordinates.length - 1];
        ctx!.moveTo(lastCoord[0], lastCoord[1]);
        ctx!.lineTo(this.x, this.y);
        ctx!.strokeStyle = `hsl(${this.hue}, 100%, 60%)`;
        ctx!.lineWidth = 3;
        ctx!.stroke();
      }
    }

    // 3. Lớp Lời chúc (Chỉnh hiện ra và biến mất nhanh hơn)
    // Thay thế toàn bộ class FloatingText cũ bằng class này:
    class FloatingText {
      x: number; y: number; wish: Wish; hue: number;
      life: number; maxLife: number; vy: number; scale: number;

      constructor(x: number, y: number, wish: Wish, hue: number) {
        this.x = x; this.y = y;
        this.wish = wish;
        this.hue = hue;
        this.life = 0; // Bộ đếm thời gian
        this.maxLife = 140; // Tổng thời gian tồn tại trên không (khoảng >2 giây)
        this.vy = -0.3; // Tốc độ bay lên rấttttt chậm
        this.scale = 0.2; // Bắt đầu với kích thước rất nhỏ
      }

      update(index: number) {
        this.y += this.vy;
        this.life++;

        // Phóng to từ từ (mượt hơn trước rất nhiều)
        if (this.scale < 1) this.scale += 0.02;

        // Khi hết vòng đời thì xóa chữ
        if (this.life >= this.maxLife) {
          floatingTexts.splice(index, 1);
        }
      }

      draw() {
        ctx!.save();

        // Thuật toán Fade-in và Fade-out (GIỮ NGUYÊN)
        let currentAlpha = 1;
        if (this.life < 40) {
          currentAlpha = this.life / 40;
        } else if (this.life > this.maxLife - 30) {
          currentAlpha = (this.maxLife - this.life) / 30;
        }
        ctx!.globalAlpha = Math.max(0, Math.min(currentAlpha, 1));

        ctx!.translate(this.x, this.y);
        ctx!.scale(this.scale, this.scale);
        ctx!.textAlign = "center";
        // Giảm shadow một chút trên mobile cho đỡ bị lóa
        ctx!.shadowBlur = window.innerWidth < 768 ? 10 : 15;
        ctx!.shadowColor = `hsl(${this.hue}, 100%, 50%)`;

        // --- PHẦN CHỈNH SỬA FONT CHỮ VÀ KÍCH THƯỚC MỚI ---

        // 1. Kiểm tra xem có phải là thiết bị di động không (màn hình nhỏ hơn 768px)
        const isMobile = window.innerWidth < 768;

        // 2. Định nghĩa bộ font chữ hiện đại, đẹp mắt trên mọi hệ điều hành
        const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        // 3. Thiết lập kích thước chữ tùy theo thiết bị
        // Mobile: Sender 14px, Message 20px
        // Desktop: Sender 18px, Message 28px
        const senderSize = isMobile ? "14px" : "18px";
        const messageSize = isMobile ? "20px" : "28px";
        // Điều chỉnh khoảng cách giữa 2 dòng trên mobile cho gọn
        const senderOffsetY = isMobile ? -18 : -25;

        // Vẽ Tên người gửi (Sender)
        // Dùng font weight 600 (semi-bold) cho sender trông thanh thoát hơn
        ctx!.font = `200 ${senderSize} ${fontFamily}`;
        ctx!.fillStyle = `hsl(${this.hue}, 100%, 85%)`; // Màu sáng hơn xíu
        ctx!.fillText(this.wish.sender + " chúc bạn", 0, senderOffsetY);

        // Vẽ Lời chúc (Message)
        // Dùng font weight 800 (extra-bold) cho lời chúc nổi bật
        ctx!.font = `400 ${messageSize} ${fontFamily}`;
        ctx!.fillStyle = "#ffffff";
        ctx!.fillText(`${this.wish.message}`, 0, 5);

        // -------------------------------------------------

        ctx!.restore();
      }
    }

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      ctx.globalCompositeOperation = 'source-over';
      // Giảm độ mờ của nền đen (từ 0.15 xuống 0.1) giúp vệt lửa lưu lại trên nền lâu hơn
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'lighter';

      // --- THUẬT TOÁN ĐỒNG BỘ ÂM THANH ---
      let currentVolume = 0;
      // Đo lường độ lớn của âm thanh tại frame hiện tại
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        currentVolume = sum / dataArrayRef.current.length; // Giá trị trung bình từ 0 đến ~150
      }
      // Đặt xác suất nền cực thấp (lúc nhạc tĩnh lặng hoặc chưa có nhạc)
      let launchProbability = window.innerWidth < 768 ? 0.005 : 0.01; 

      // Nếu nhạc bắt đầu dập mạnh (nhạc dạo, nhịp bass)
      if (currentVolume > 80) {
        launchProbability = window.innerWidth < 768 ? 0.03 : 0.06;
      }
      // NẾU NHẠC LÊN CAO TRÀO (Điệp khúc, nốt cao, bass căng)
      if (currentVolume > 110) {
        // Xác suất tăng vọt -> Pháo hoa nổ tưng bừng như trút mưa!
        launchProbability = window.innerWidth < 768 ? 0.08 : 0.15;
      }
      // -----------------------------------

      if (Math.random() < launchProbability) { // Bắn pháo thưa ra một chút (0.05) để ngắm pháo rơi
        const startX = Math.random() * canvas.width;
        const targetX = startX + (Math.random() * 200 - 100);
        // 1. Quy định mức trần (cách đỉnh màn hình 20%)
        const topMargin = canvas.height * 0.2;
        // 2. Pháo hoa chỉ nổ trong khoảng từ mức trần (20%) kéo xuống đến giữa màn hình (50%)
        const targetY = topMargin + Math.random() * (canvas.height * 0.4);
        // const targetY = Math.random() * (canvas.height / 2.5);
        fireworks.push(new Firework(startX, canvas.height, targetX, targetY));
      }

      fireworks.forEach((fw, i) => fw.update(i));
      particles.forEach((p, i) => p.update(i));
      floatingTexts.forEach((ft, i) => ft.update(i));

      fireworks.forEach(fw => fw.draw());
      particles.forEach(p => p.draw());

      ctx.globalCompositeOperation = 'source-over';
      floatingTexts.forEach(ft => ft.draw());
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [wishes]);

  // Quản lý trạng thái nhạc nền
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  // --- THÊM PHẦN NÀY ĐỂ PHÂN TÍCH ÂM THANH ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const isAudioInitialized = useRef(false);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden z-0">

      {/* LỚP 1: Pháo hoa (Nằm dưới cùng - z-0) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* LỚP 2: Ảnh Thành Phố (Nằm đè lên pháo hoa ở đáy màn hình - z-10) */}
      <div className="absolute bottom-0 left-0 w-full h-[15vh] md:h-[30vh] pointer-events-none z-10">
        <img
          src="/images/image.png"
          alt="Thành phố về đêm"
          className="w-full h-full object-cover md:object-contain object-bottom"
        />
        <div className="absolute bottom-0 left-0 w-full h-1/5 bg-gradient-to-t from-black to-transparent"></div>
      </div>

      {/* THÊM KHỐI STYLE CHO FONT TẾT VÀ HIỆU ỨNG NEON */}
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
      .font-tet { font-family: 'Pacifico', cursive; }
      /* Tông xanh dương kết hợp xanh lơ (Cyan) cho cảm giác công nghệ, hiện đại */
      .neon-bktin {
        color: #f0f9ff; /* Chữ trắng xanh nhẹ */
        text-shadow: 0 0 2px #fff, 0 0 8px #3b82f6, 0 0 20px #2563eb;
      }
      /* Tông xanh Neon sáng mạnh hơn */
      .neon-chucmung {
        color: #fff;
        text-shadow: 0 0 5px #fff, 0 0 10px #06b6d4, 0 0 20px #0891b2, 0 0 30px #0e7490;
      }
    `}</style>

      {/* THẺ AUDIO ẨN ĐỂ CHẠY NHẠC */}
      <audio ref={audioRef} src="/nhac_tet.mp3" loop autoPlay />

      {/* LỚP 3: Logo và Lời chúc BKTin (Hiệu ứng Neon siêu sáng) */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex items-center gap-3 md:gap-4 pointer-events-none animate-fade-in-up">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500 blur-lg opacity-70 rounded-full animate-pulse"></div>
          <img
            src="/images/avatar-bktin.jpg"
            alt="BKTin Logo"
            className="relative w-10 h-10 md:w-15 md:h-15 object-contain bg-white rounded-full border-2 border-yellow-400 p-0.25"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-2xl font-black text-white uppercase neon-bktin tracking-widest">
            BKTin
          </h1>
          <p className="text-md md:text-xl text-yellow-200 font-tet neon-chucmung tracking-wide">
            Chúc Mừng Năm Mới
          </p>
        </div>
      </div>

      {/* LỚP 4: Cụm Nút Điều Khiển (Góc trên bên phải) */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-3">
        {/* Nút Bật/Tắt Nhạc */}
        <button
          onClick={toggleMusic}
          className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md border border-yellow-500/50 text-xl rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all"
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        {/* Nút Tạo Lời Chúc */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-2 py-1 md:py-1 bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md border border-yellow-500/50 text-yellow-400 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all font-semibold flex items-center gap-2"
        >
          <span className="text-md hidden md:inline">✨</span> <span className="">Tạo Lời Chúc Mới</span>
        </button>
      </div>

      {/* LỚP 5: Modal Form (Nằm trên cùng - z-50) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-yellow-500/30 p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-white relative max-h-[90vh] overflow-y-auto custom-scrollbar">

            <button
              onClick={() => { setIsModalOpen(false); setNewLink(''); }}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Gửi Lời Chúc
            </h2>

            {!newLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 font-medium text-yellow-300">Tên của bạn</label>
                  <input
                    type="text" required value={sender} onChange={(e) => setSender(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-black/80 border border-white/20 focus:outline-none focus:border-yellow-400 text-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-yellow-300">Các lời chúc (Mỗi ô 1 lời chúc)</label>
                  {messages.map((msg, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text" required
                        value={msg}
                        onChange={(e) => handleMessageChange(index, e.target.value)}
                        placeholder={`Lời chúc ${index + 1}...`}
                        className="flex-1 px-4 py-2 rounded-lg bg-black/80 border border-white/20 focus:outline-none focus:border-yellow-400 text-white transition-colors"
                      />
                      {messages.length > 1 && (
                        <button type="button" onClick={() => removeMessageInput(index)} className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addMessageInput} className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                  <span className="text-lg leading-none">+</span> Thêm ô lời chúc
                </button>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 font-bold hover:scale-105 transition-transform disabled:opacity-50 text-black shadow-lg"
                >
                  {loading ? 'Đang tạo...' : 'Phóng Lên Trời 🚀'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-green-400 font-semibold">Đã tạo link thành công!</p>
                <div className="p-3 bg-black/80 rounded break-all text-sm border border-white/20 text-yellow-200">
                  {newLink}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(newLink)}
                  className="px-4 py-3 rounded bg-white/10 hover:bg-white/20 font-semibold transition-colors w-full border border-white/10"
                >
                  Copy Link Chia Sẻ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}