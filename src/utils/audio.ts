let audioCtx: AudioContext | null = null;
let isMuted = false;
let ambientInterval: any = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
};

export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted) {
    stopAmbientCrowd();
  }
  return isMuted;
};

export const getIsMuted = () => isMuted;

// Tiếng lầm rầm ambient của khán đài khi đang diễn ra trận đấu
export const startAmbientCrowd = () => {
  if (ambientInterval || isMuted) return;
  initAudio();

  ambientInterval = setInterval(() => {
    if (isMuted || !audioCtx) return;
    try {
      const bufferSize = audioCtx.sampleRate * 1.5;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 300;
      filter.Q.value = 1.5;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
      noise.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      // Bỏ qua lỗi audio context nếu chưa tương tác
    }
  }, 2000);
};

export const stopAmbientCrowd = () => {
  if (ambientInterval) {
    clearInterval(ambientInterval);
    ambientInterval = null;
  }
};

export const playWhistle = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(2500, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

export const playKick = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
};

// Tiếng khán đài reo hò bùng nổ khi ghi bàn
export const playCheer = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  // Tạo tiếng hú reo từ đám đông bằng White Noise kết hợp bộ lọc
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.linearRampToValueAtTime(1200, now + 1);
  filter.Q.value = 1;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 2);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start(now);
  noise.stop(now + 2);

  // Âm giai chiến thắng hòa cùng tiếng reo
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    g.gain.setValueAtTime(0.1, now + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
    osc.connect(g);
    g.connect(audioCtx!.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.4);
  });
};

// Tiếng khán đài ồ lên thất vọng khi miss hoặc sút trúng cột dọc
export const playGroan = () => {
  if (isMuted) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 1.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.linearRampToValueAtTime(200, now + 1.2);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start(now);
  noise.stop(now + 1.2);
};
