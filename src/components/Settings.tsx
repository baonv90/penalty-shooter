import React, { useState } from "react";
import {
  useGameStore,
  Difficulty,
  BallType,
  ShootMethod,
  AVAILABLE_COLORS,
} from "../store/gameStore";
import { initAudio, playWhistle } from "../utils/audio";

export const JerseyIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M14.28 2.37a2.5 2.5 0 00-4.56 0L5 4.5v3.5l2 1.5v10h10v-10l2-1.5V4.5l-4.72-2.13z" />
  </svg>
);

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

  return (
    <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl text-white w-full max-w-xl border border-slate-700">
      <h1 className="text-3xl font-black mb-6 text-center text-green-400 tracking-wider">
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

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
          Cách sút
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setMethod("button")}
            className={`flex-1 py-3 rounded-xl border-2 font-bold ${
              method === "button"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            Phím / Nút bấm
          </button>
          <button
            onClick={() => setMethod("voice")}
            className={`flex-1 py-3 rounded-xl border-2 font-bold ${
              method === "voice"
                ? "bg-green-600 border-green-400"
                : "bg-slate-900 border-slate-600"
            }`}
          >
            🎙️ Giọng nói ("Sút")
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {[0, 1].map((playerId) => (
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
            <input
              type="text"
              value={players[playerId].name}
              onChange={(e) => setPlayerName(playerId, e.target.value)}
              maxLength={12}
              className="bg-slate-900 border border-slate-600 text-white font-bold px-3 py-1.5 rounded-lg mb-3 w-full text-center focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              placeholder={`Tên`}
            />
            <div className="flex gap-2 flex-wrap justify-center">
              {AVAILABLE_COLORS.map((c) => (
                <div
                  key={"p1" + c}
                  onClick={() => setPlayerColor(playerId, c)}
                  className={`w-10 h-10 p-1 rounded-full border-2 ${
                    players[playerId].jerseyColor === c
                      ? "border-green-400 scale-125"
                      : "border-transparent"
                  }`}
                >
                  <JerseyIcon className={`text-${c}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleStart}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-2xl font-black text-2xl tracking-widest transition-transform shadow-[0_6px_0_rgb(6,78,59)] active:translate-y-2 active:shadow-none"
      >
        VÀO SÂN
      </button>
    </div>
  );
}
