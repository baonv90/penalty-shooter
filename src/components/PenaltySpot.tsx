import { useState, useEffect } from "react";
import { motion, useMotionValue, animate, useTransform } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { playKick, playCheer, playGroan } from "../utils/audio";

export default function PenaltySpot() {
  const {
    difficulty,
    isShooting,
    setShooting,
    recordShot,
    players,
    turn,
    gamePhase,
    setNetBulge,
    ballType,
    shootMethod,
  } = useGameStore();
  const currentPlayer = players[turn];

  const scaleValue = useMotionValue(1);
  const colorValue = useTransform(
    scaleValue,
    [1, 1.3, 1.8, 2.5],
    [
      "rgb(34, 197, 94)",
      "rgb(234, 179, 8)",
      "rgb(239, 68, 68)",
      "rgb(239, 68, 68)",
    ]
  );

  const speed =
    difficulty === "easy" ? 0.8 : difficulty === "medium" ? 0.5 : 0.3;
  const [ballAnim, setBallAnim] = useState({ x: 0, y: 0, scale: 1 });
  // State quản lý chuyển động của thủ môn
  const [gkAnim, setGkAnim] = useState({ x: 0 });
  const [resultMsg, setResultMsg] = useState("");

  const VOICE_THRESHOLD = 30; // Tùy chỉnh độ nhạy âm thanh tại đây (thường từ 30 - 80)

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationFrame: number;
    let stream: MediaStream;

    if (shootMethod === "voice" && !isShooting && gamePhase === "playing") {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((mediaStream) => {
          stream = mediaStream;
          audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            if (average > VOICE_THRESHOLD) {
              handleShoot(); // Kích hoạt sút khi âm lượng vượt ngưỡng
            } else {
              animationFrame = requestAnimationFrame(checkVolume);
            }
          };
          checkVolume();
        })
        .catch((err) => console.error("Mic error:", err));
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (audioContext) audioContext.close();
    };
  }, [shootMethod, isShooting, gamePhase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isShooting && gamePhase === "playing") {
        e.preventDefault();
        handleShoot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!isShooting && gamePhase === "playing") {
      scaleValue.set(1);
      const controls = animate(scaleValue, 3, {
        duration: speed,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "linear",
      });
      return () => controls.stop();
    }
  }, [isShooting, speed, scaleValue, gamePhase]);

  const handleShoot = () => {
    if (isShooting || gamePhase !== "playing") return;
    setShooting(true);
    playKick();

    const hitValue = scaleValue.get();
    const rand = Math.random();
    let shotQuality: "on_target" | "miss" | "post";

    // 1. Xác định chất lượng cú sút dựa vào vòng timing
    if (hitValue <= 1.3) {
      shotQuality = rand < 0.95 ? "on_target" : rand < 0.98 ? "post" : "miss"; // Tăng tỉ lệ trúng lên 95%
    } else if (hitValue <= 1.6) {
      shotQuality = rand < 0.8 ? "on_target" : rand < 0.9 ? "post" : "miss";
    } else {
      shotQuality = rand < 0.4 ? "on_target" : rand < 0.7 ? "post" : "miss";
    }

    // 2. Phân loại hướng đi của bóng và hướng đổ người của Thủ môn
    const directions = ["left", "center", "right"];
    const ballDir = directions[Math.floor(Math.random() * directions.length)];
    const gkDir = directions[Math.floor(Math.random() * directions.length)];

    // 3. Quyết định kết quả cuối cùng
    let finalResult: "goal" | "miss" | "post" | "save" = shotQuality as any;
    if (shotQuality === "on_target") {
      const threshold =
        difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.5 : 0.7;
      const gkIsLucky = Math.random() < threshold;
      if (ballDir === gkDir && gkIsLucky) {
        finalResult = "save";
      } else {
        finalResult = "goal";
      }
    }

    // 4. Set tọa độ bay của thủ môn
    let gkEndX = 0;
    if (gkDir === "left") gkEndX = -70;
    else if (gkDir === "right") gkEndX = 70;
    setGkAnim({ x: gkEndX });

    // 5. Set tọa độ bay của bóng
    let endY = -100;
    let endX = 0;

    if (finalResult === "save") {
      // Bóng bay tới vị trí của thủ môn (vạch vôi ~ -95px)
      endY = -200;
      endX = gkEndX; // Bóng đập thẳng vào người GK
    } else if (finalResult === "goal") {
      endY = -240; // Bay sâu vào lưới
      if (ballDir === "left") endX = -70 - Math.random() * 20;
      else if (ballDir === "right") endX = 70 + Math.random() * 20;
      else endX = (Math.random() - 0.5) * 40;
    } else if (finalResult === "post") {
      endY = -200;
      endX = Math.random() > 0.5 ? 100 : -100; // Trúng cột dọc trái/phải
    } else {
      endY = -270;
      endX = Math.random() > 0.5 ? 180 : -180; // Bay ra ngoài
    }

    setBallAnim({ x: endX, y: endY, scale: 0.55 });

    // 6. Hiệu ứng va chạm và kết quả sau khi bóng bay đến đích (450ms)
    setTimeout(() => {
      if (finalResult === "save") {
        setResultMsg("🧤 CẢN PHÁ!");
        playGroan(); // Tiếng khán đài tiếc nuối
        // Bóng đập người thủ môn nảy ngược lại (phản xạ)
        setBallAnim((prev) => ({
          x: prev.x * 0.4,
          y: prev.y + 60,
          scale: 0.7,
        }));
      } else if (finalResult === "goal") {
        setResultMsg("⚽ VÀOOOOOO!");
        setNetBulge(true);
        playCheer();
      } else if (finalResult === "post") {
        setResultMsg("💥 CỘT DỌC!");
        playGroan();
        // Bóng nảy ra từ cột dọc
        setBallAnim((prev) => ({
          x: prev.x * 1.3,
          y: prev.y + 30,
          scale: 0.65,
        }));
      } else {
        setResultMsg("❌ TRƯỢT!");
        playGroan();
      }

      // 7. Reset vòng lặp trận đấu
      setTimeout(() => {
        setResultMsg("");
        setNetBulge(false);
        setBallAnim({ x: 0, y: 0, scale: 1 });
        setGkAnim({ x: 0 }); // Reset thủ môn về giữa

        // Save tính là một cú sút hỏng (miss) trên bảng tỉ số
        recordShot(finalResult === "save" ? "miss" : finalResult);
      }, 2300);
    }, 450);
  };

  const getBallStyle = () => {
    if (ballType === "classic")
      return {
        background:
          "radial-gradient(circle at 30% 30%, #8b4513 0%, #5c2e0b 100%)",
      };
    if (ballType === "modern")
      return {
        background:
          "radial-gradient(circle at 30% 30%, #39ff14 0%, #008000 100%)",
        boxShadow: "0 0 12px #39ff14",
      };
    return {
      background:
        "radial-gradient(circle at 30% 30%, #ffffff 0%, #d1d5db 60%, #9ca3af 100%)",
    };
  };

  if (gamePhase !== "playing") return null;

  return (
    <div className="absolute top-[280px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-30 pointer-events-none">
      {/* Hiệu ứng Text */}
      {resultMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.5 }}
          animate={{ opacity: 1, y: -60, scale: 1 }}
          className="absolute -top-[100px] text-4xl md:text-5xl font-black text-yellow-300 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] z-50 whitespace-nowrap"
        >
          {resultMsg}
        </motion.div>
      )}

      {/* Vòng canh nhịp (Timing Ring) */}
      {!isShooting && (
        <motion.div
          style={{
            scale: scaleValue,
            borderColor: colorValue,
            background: colorValue,
          }}
          className="absolute w-[40px] h-[40px] rounded-full border-[2px] opacity-40 z-20"
        />
      )}

      {/* Thủ môn (Goalkeeper) - Đứng trên vạch vôi cách bóng -95px */}
      <motion.div
        animate={gkAnim}
        transition={{ duration: 0.35, ease: "easeOut" }} // Thủ môn bay nhanh hơn bóng 1 chút
        className="absolute -top-[210px] flex flex-col items-center z-20 drop-shadow-lg"
      >
        {/* Hình dáng Thủ môn dạng Lego/chữ nhật */}
        <div className="w-4 h-4 bg-[#facc15] rounded-sm border-[1.5px] border-slate-800 z-20" />
        <div className="w-9 h-6 -mt-0.5 rounded-t-md border-[1.5px] border-slate-800 shadow-md bg-purple-600 flex justify-center overflow-hidden">
          <div className="w-4 h-full bg-purple-400/50" />
        </div>
      </motion.div>

      <div className="absolute top-[40px] flex flex-col items-center z-10 pointer-events-none drop-shadow-xl">
        {/* Đầu Lego */}
        <div className="w-5 h-6 bg-[#facc15] rounded-md border-[2px] border-slate-700 shadow-inner z-20" />
        {/* Thân Lego mặc áo */}
        <div
          className={`w-11 h-10 -mt-1 rounded-lg border-[1.5px] border-slate-700 shadow-md flex items-start justify-center ${currentPlayer.jerseyColor.replace(
            "text",
            "bg"
          )}`}
        >
          <span className="text-white text-xs font-black drop-shadow-md">
            {currentPlayer.name.slice(0, 4).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Bóng bay đi (Tâm xoay tại 0,0) */}
      <motion.div
        animate={ballAnim}
        transition={{ duration: 0.45, ease: isShooting ? "easeOut" : "linear" }}
        className="w-7 h-7 rounded-full z-40 border border-black/40 shadow-xl"
        style={getBallStyle()}
      >
        {ballType === "standard" && (
          <>
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full absolute top-1 left-2 opacity-80" />
            <div className="w-2 h-2 bg-slate-900 rounded-full absolute bottom-1 right-2 opacity-80" />
          </>
        )}
      </motion.div>
      {shootMethod === "button" ? (
        <button
          className="absolute w-[100vw] h-[100vh] pointer-events-auto bg-transparent"
          onClick={handleShoot}
        />
      ) : (
        <div className="absolute top-[80px] px-4 py-2 bg-slate-900/90 border border-green-500/50 text-green-400 font-bold rounded-full text-xs flex flex-col items-center shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span>🎙️ Hét lớn để sút!</span>
          </div>
        </div>
      )}
    </div>
  );
}
