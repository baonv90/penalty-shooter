import { useState } from "react";
import { useGameStore } from "./store/gameStore";
import PitchBackground from "./components/PitchBackground";
import ScoreBoard from "./components/ScoreBoard";
import PenaltySpot from "./components/PenaltySpot";
import Settings from "./components/Settings";
import { toggleMute, getIsMuted } from "./utils/audio";

export default function App() {
  const { gamePhase, winner, players, startGame, resetGame } = useGameStore();
  const [muted, setMuted] = useState(getIsMuted());

  const handleToggleMute = () => {
    const status = toggleMute();
    setMuted(status);
  };

  return (
    <main className="relative w-screen h-screen bg-slate-950 flex flex-col items-center font-sans select-none overflow-hidden">
      {/* Khán đài (Audience) - 3 hàng ngang */}
      <div className="w-full bg-slate-900 border-b-4 border-slate-800 flex flex-col items-center justify-center py-4 gap-2 z-10 overflow-hidden shadow-xl">
        {Array.from({ length: 3 }).map((_, r) => (
          <div
            key={r}
            className="flex gap-2 justify-center w-full min-w-max px-4"
          >
            {Array.from({ length: 40 }).map((__, i) => {
              const colors = [
                "bg-red-500",
                "bg-blue-500",
                "bg-yellow-400",
                "bg-white",
                "bg-slate-400",
                "bg-purple-500",
                "bg-green-500",
                "bg-orange-500",
              ];
              const shirtColor = colors[(i + r * 3) % colors.length];

              return (
                <div key={i} className="flex flex-col items-center -ml-1">
                  {/* Đầu khán giả */}
                  <div className="w-2.5 h-2 bg-[#facc15] rounded-sm border border-slate-800 z-10" />
                  {/* Thân khán giả */}
                  <div
                    className={`w-4 h-3.5 -mt-[1px] rounded-t-sm border border-slate-800 ${shirtColor}`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bảng tỉ số (nằm hoàn toàn ngoài sân bóng để không che gôn) */}
      {gamePhase !== "menu" && (
        <div className="w-full max-w-3xl px-4 py-4 z-10">
          <ScoreBoard />
        </div>
      )}

      {/* Sân bóng chính */}
      <div className="relative flex-1 w-full max-w-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-3xl overflow-hidden border-4 border-slate-800 border-b-0 flex flex-col items-center bg-[#2e7d32]">
        <PitchBackground />

        {gamePhase === "menu" ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <Settings />
          </div>
        ) : (
          <PenaltySpot />
        )}

        {/* Trạng thái Kết thúc Game */}
        {gamePhase === "gameover" && winner && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6">
            <h2 className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce mb-10 text-center uppercase tracking-wider">
              CHÚC MỪNG
              <br />
              {players[winner - 1].name} THẮNG!
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                onClick={startGame}
                className="flex-1 py-4 bg-gradient-to-b from-green-400 to-green-600 text-white font-black rounded-full text-xl shadow-[0_6px_0_#166534] active:translate-y-1 active:shadow-none transition-all"
              >
                ⚽ CHƠI LẠI
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-4 bg-gradient-to-b from-slate-600 to-slate-800 text-white font-black rounded-full text-xl shadow-[0_6px_0_#1e293b] active:translate-y-1 active:shadow-none transition-all"
              >
                🏠 VỀ MENU
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-6 z-[60] flex items-center gap-3">
        {gamePhase !== "menu" && (
          <button
            onClick={resetGame}
            className="px-4 py-2.5 bg-red-700/90 hover:bg-red-600 text-white text-sm font-bold rounded-full border border-red-500 shadow-2xl flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md"
          >
            🚪 Thoát game
          </button>
        )}
        <button
          onClick={handleToggleMute}
          className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white text-sm font-bold rounded-full border border-slate-600 shadow-2xl flex items-center gap-2 transition-all active:scale-95 backdrop-blur-md"
        >
          {muted ? "🔇 Đã tắt tiếng" : "🔊 Bật âm thanh"}
        </button>
      </div>
    </main>
  );
}
