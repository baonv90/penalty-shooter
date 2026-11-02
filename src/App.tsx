import { useState } from "react";
import { useGameStore } from "./store/gameStore";
import Settings from "./components/Settings";
import PenaltySpot from "./components/PenaltySpot";
import GameBoard3D from "./components/GameBoard3D";
import ScoreBoard from "./components/ScoreBoard";
import PitchBackground from "./components/PitchBackground";
import { getIsMuted, toggleMute } from "./utils/audio";

export default function App() {
  const { gamePhase, winner, players, startGame, resetGame, graphicsMode } =
    useGameStore();
  const [muted, setMuted] = useState(getIsMuted());

  const handleToggleMute = () => {
    const status = toggleMute();
    setMuted(status);
  };

  return (
    <main className="relative w-full h-[100dvh] px-2 sm:px-5 pb-3 bg-slate-950 flex flex-col items-center font-sans select-none overflow-hidden">
      {/* Bảng tỉ số (nằm hoàn toàn ngoài sân bóng để không che gôn) */}
      {gamePhase !== "menu" && (
        <div className="w-full max-w-4xl p-3 z-10">
          <ScoreBoard />
        </div>
      )}

      {/* Sân bóng chính */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col items-center">
        {gamePhase === "menu" ? (
          <div className="absolute inset-0 z-40 overflow-y-auto overscroll-contain bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 pb-24">
            <div className="flex min-h-full items-center justify-center">
              <Settings />
            </div>
          </div>
        ) : graphicsMode === "2d" ? (
          <>
            <PitchBackground />
            <PenaltySpot />
          </>
        ) : (
          <GameBoard3D />
        )}

        {/* Trạng thái Kết thúc Game */}
        {gamePhase === "gameover" && winner && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6">
            <h2 className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-bounce mb-10 text-center uppercase tracking-wider">
              CHÚC MỪNG
              <br />
              {players[winner - 1].name}
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

      <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-[60] flex items-center gap-3">
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
