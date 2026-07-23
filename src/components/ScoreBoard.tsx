import { useGameStore } from "../store/gameStore";

export default function ScoreBoard() {
  const { players, turn, gamePhase } = useGameStore();

  const renderShots = (shots: string[]) => {
    const totalSlots = Math.max(
      5,
      shots.length + (gamePhase === "playing" ? 1 : 0)
    );
    return (
      <div className="flex gap-1.5 mt-2">
        {Array.from({ length: totalSlots }).map((_, i) => {
          const res = shots[i];
          if (res === "goal")
            return (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-700 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              >
                ✓
              </div>
            );
          if (res === "miss" || res === "post")
            return (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              >
                ✗
              </div>
            );
          return (
            <div
              key={i}
              className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-500 shadow-inner"
            />
          );
        })}
      </div>
    );
  };

  const p1Score = players[0].shots.filter((s) => s === "goal").length;
  const p2Score = players[1].shots.filter((s) => s === "goal").length;

  return (
    <div className="flex justify-between w-full bg-slate-800/95 p-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-slate-600 items-center backdrop-blur-md">
      <div
        className={`flex flex-col items-start transition-all duration-300 ${
          turn === 0 ? "scale-105" : "opacity-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-full border-[2px] border-white shadow-md ${players[0].jerseyColor}`}
          />
          <span className="font-bold text-white text-base tracking-wide">
            {players[0].name}
          </span>
        </div>
        {renderShots(players[0].shots)}
      </div>

      <div className="px-6 py-2 bg-slate-900 rounded-2xl border border-slate-700 shadow-inner text-4xl font-black text-slate-200 tracking-widest">
        {p1Score} - {p2Score}
      </div>

      <div
        className={`flex flex-col items-end transition-all duration-300 ${
          turn === 1 ? "scale-105" : "opacity-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-base tracking-wide">
            {players[1].name}
          </span>
          <div
            className={`w-5 h-5 rounded-full border-[2px] border-white shadow-md ${players[1].jerseyColor}`}
          />
        </div>
        {renderShots(players[1].shots)}
      </div>
    </div>
  );
}
