import { useState } from "react";
import {
  useGameStore,
  Difficulty,
  BallType,
  ShootMethod,
  AVAILABLE_COLORS,
  GKType,
} from "../store/gameStore";
import { initAudio } from "../utils/audio";

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
    updateSettings(diff, ball, method);
    startGame();
  };

  const handleGkChange = (playerId: number, type: GKType) => {
    setGKType(playerId, type);
  };

  return (
    <div className="bg-slate-800/95 p-4 sm:p-6 shadow-2xl text-white w-full max-w-2xl mx-auto rounded-2xl border border-slate-700">
      <h1 className="text-xl sm:text-2xl font-black mb-4 text-center text-green-400 tracking-wider">
        PENALTY SHOOTOUT
      </h1>

      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 mb-4">
        <div>
          <label
            htmlFor="difficulty"
            className="block text-xs font-bold text-gray-400 mb-2 uppercase"
          >
            Độ khó
          </label>
          <select
            className="min-w-0 w-full p-3 text-sm bg-slate-900 rounded-xl outline-none border border-slate-600"
            id="difficulty"
            value={diff}
            onChange={(e) => setDiff(e.target.value as Difficulty)}
          >
            <option value="easy">Dễ (Chậm)</option>
            <option value="medium">Bình thường</option>
            <option value="hard">Khó (Nhanh)</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="ball-type"
            className="block text-xs font-bold text-gray-400 mb-2 uppercase"
          >
            Kiểu bóng
          </label>
          <select
            className="min-w-0 w-full p-3 text-sm bg-slate-900 rounded-xl outline-none border border-slate-600"
            id="ball-type"
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
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod("button")}
            className={`min-h-[44px] px-2 py-2 text-sm rounded-xl border-2 font-bold ${
              method === "button"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            Phím / Nút bấm
          </button>
          <button
            onClick={() => setMethod("voice")}
            className={`min-h-[44px] px-2 py-2 text-sm rounded-xl border-2 font-bold ${
              method === "voice"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            🎙️ Giọng nói ("Sút")
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[0, 1].map((playerId) => (
          <div
            key={playerId}
            className="min-w-0 bg-slate-900 p-3 rounded-xl border border-slate-700"
          >
            <input
              aria-label={`Tên người chơi ${playerId + 1}`}
              type="text"
              value={players[playerId].name}
              onChange={(e) => setPlayerName(playerId, e.target.value)}
              maxLength={12}
              className="bg-slate-900 border border-slate-600 text-white font-bold px-3 py-1.5 rounded-lg mb-3 w-full text-center focus:outline-none focus:border-yellow-400"
              placeholder={`Tên Player ${playerId + 1}`}
            />
            <div className="flex gap-2 flex-wrap justify-center">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  type="button"
                  aria-label={`Màu áo ${c.replace("bg-", "")} cho người chơi ${playerId + 1}`}
                  aria-pressed={players[playerId].jerseyColor === c}
                  key={c}
                  onClick={() => setPlayerColor(playerId, c)}
                  className={`w-9 h-9 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                    players[playerId].jerseyColor === c
                      ? "border-green-400 scale-110"
                      : "border-transparent"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full ${c}`} />
                </button>
              ))}
            </div>
            <fieldset className="mt-3 min-w-0">
              <legend className="text-xs font-bold text-slate-400 mb-2 uppercase">
                Thủ môn
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      type: "human",
                      icon: "🧤",
                      label: "Human",
                      trait: "Cân bằng",
                    },
                    {
                      type: "bear",
                      icon: "🐻",
                      label: "Bear",
                      trait: "To · Chậm",
                    },
                    {
                      type: "skunk",
                      icon: "🦨",
                      label: "Skunk",
                      trait: "Nhỏ · Nhanh",
                    },
                  ] as const
                ).map(({ type, icon, label, trait }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleGkChange(playerId, type)}
                    aria-pressed={players[playerId].gkType === type}
                    className={`min-w-0 rounded-xl border-2 px-1 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-400 ${
                      players[playerId].gkType === type
                        ? "border-green-400 bg-green-500/15"
                        : "border-slate-700 bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <span aria-hidden="true" className="block text-3xl mb-1">
                      {icon}
                    </span>
                    <span className="block text-xs font-bold">{label}</span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {trait}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
          Đồ hoạ (Graphics)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGraphicsMode("2d")}
            className={`min-h-[44px] px-2 py-2 text-sm rounded-xl font-bold border-2 ${
              graphicsMode === "2d"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600 text-slate-400"
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setGraphicsMode("3d")}
            className={`min-h-[44px] px-2 py-2 text-sm rounded-xl font-bold border-2 ${
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
