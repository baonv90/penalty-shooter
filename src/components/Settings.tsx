import { useState } from "react";
import {
  useGameStore,
  Difficulty,
  BallType,
  ShootMethod,
  AVAILABLE_COLORS,
  GKType,
} from "../store/gameStore";
import { initAudio, playWhistle } from "../utils/audio";

export default function Settings() {
  const {
    difficulty,
    ballType,
    shootMethod,
    players,
    updateSettings,
    startGame,
    setPlayerColor,
    setPlayerName,
    setGKType,
    graphicsMode,
    setGraphicsMode,
  } = useGameStore();

  const [diff, setDiff] = useState<Difficulty>(difficulty);
  const [ball, setBall] = useState<BallType>(ballType);
  const [method, setMethod] = useState<ShootMethod>(shootMethod);

  const handleStart = () => {
    initAudio();
    playWhistle();
    updateSettings(diff, ball, method);
    startGame();
  };

  const handleGkChange = (playerId: number, type: GKType) => {
    setGKType(playerId, type);
  };

  return (
    <div className="bg-slate-800 p-6 shadow-2xl text-white w-full max-w-xl mx-auto my-5">
      <h1 className="text-2xl font-black mb-6 text-center text-green-400 tracking-wider">
        PENALTY SHOOTOUT
      </h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
            Độ khó
          </label>
          <select
            className="w-full p-3 bg-slate-900 rounded-xl outline-none border border-slate-600"
            value={diff}
            onChange={(e) => setDiff(e.target.value as Difficulty)}
          >
            <option value="easy">Dễ (Chậm)</option>
            <option value="medium">Bình thường</option>
            <option value="hard">Khó (Nhanh)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
            Kiểu bóng
          </label>
          <select
            className="w-full p-3 bg-slate-900 rounded-xl outline-none border border-slate-600"
            value={ball}
            onChange={(e) => setBall(e.target.value as BallType)}
          >
            <option value="standard">Tiêu chuẩn (Trắng đen)</option>
            <option value="classic">Cổ điển (Da nâu)</option>
            <option value="modern">Hiện đại (Neon)</option>
          </select>
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
          Cách sút
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setMethod("button")}
            className={`flex-1 py-2 rounded-xl border-2 font-bold ${
              method === "button"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            Phím / Nút bấm
          </button>
          <button
            onClick={() => setMethod("voice")}
            className={`flex-1 py-2 rounded-xl border-2 font-bold ${
              method === "voice"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            🎙️ Giọng nói ("Sút")
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-5">
        {[0, 1].map((playerId) => (
          <div
            key={playerId}
            className="bg-slate-900 p-4 rounded-xl border border-slate-700"
          >
            <input
              type="text"
              value={players[playerId].name}
              onChange={(e) => setPlayerName(playerId, e.target.value)}
              maxLength={12}
              className="bg-slate-900 border border-slate-600 text-white font-bold px-3 py-1.5 rounded-lg mb-3 w-full text-center focus:outline-none focus:border-yellow-400"
              placeholder={`Tên Player ${playerId + 1}`}
            />
            <div className="flex gap-2 flex-wrap justify-center">
              {AVAILABLE_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setPlayerColor(playerId, c)}
                  className={`w-9 h-9 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                    players[playerId].jerseyColor === c
                      ? "border-green-400 scale-110"
                      : "border-transparent"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${c}`} />
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex gap-4">
                {/* Human GK */}
                <button
                  onClick={() => handleGkChange(playerId, "human")}
                  className={`p-2 bg-blue-500 rounded ${
                    players[playerId].gkType === "human"
                      ? "border-2 border-green-400"
                      : ""
                  }`}
                >
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <circle cx="50" cy="30" r="20" fill="#ffdbac" />
                    <rect x="30" y="50" width="40" height="50" fill="#10b981" />
                  </svg>
                  <p className="text-white text-xs mt-1">Human</p>
                </button>

                {/* Bear GK */}
                <button
                  onClick={() => handleGkChange(playerId, "bear")}
                  className={`p-2 bg-amber-700 rounded  ${
                    players[playerId].gkType === "bear"
                      ? "border-2 border-green-400"
                      : ""
                  }`}
                >
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <circle cx="30" cy="20" r="10" fill="#5c4033" />{" "}
                    {/* Tai trái */}
                    <circle cx="70" cy="20" r="10" fill="#5c4033" />{" "}
                    {/* Tai phải */}
                    <circle cx="50" cy="40" r="25" fill="#8b5a2b" /> {/* Đầu */}
                    <rect x="20" y="60" width="60" height="40" fill="#8b5a2b" />
                    {/* Thân to */}
                  </svg>
                  <p className="text-white text-xs mt-1">Bear</p>
                </button>

                {/* Skunk GK */}
                <button
                  onClick={() => handleGkChange(playerId, "skunk")}
                  className={`p-2 bg-gray-600 rounded  ${
                    players[playerId].gkType === "skunk"
                      ? "border-2 border-green-400"
                      : ""
                  }`}
                >
                  <svg width="40" height="40" viewBox="0 0 100 100">
                    <circle cx="50" cy="35" r="15" fill="#222" />
                    <rect x="45" y="20" width="10" height="30" fill="#fff" />
                    {/* Vệt trắng */}
                    <rect x="35" y="50" width="30" height="30" fill="#222" />
                  </svg>
                  <p className="text-white text-xs mt-1">Skunk</p>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
          Đồ hoạ (Graphics)
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setGraphicsMode("2d")}
            className={`flex-1 py-2 rounded-xl font-bold border-2 ${
              graphicsMode === "2d"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600 text-slate-400"
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setGraphicsMode("3d")}
            className={`flex-1 py-2 rounded-xl font-bold border-2 ${
              graphicsMode === "3d"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600 text-slate-400"
            }`}
          >
            3D
          </button>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl font-black text-xl tracking-widest transition-transform shadow-lg active:scale-95"
      >
        VÀO SÂN
      </button>
    </div>
  );
}
