import PenaltySpot from "./PenaltySpot";
import ScoreBoard from "./ScoreBoard";
import { motion } from "framer-motion";

export default function GameBoard() {
  return (
    <div className="w-full flex flex-col items-center">
      <ScoreBoard />

      {/* Sân bóng chính */}
      <div className="relative w-full max-w-lg h-[650px] bg-grass-pattern rounded-t-xl overflow-hidden flex flex-col items-center shadow-2xl border-4 border-slate-700">
        {/* Khán đài phía sau gôn */}
        <div className="absolute top-0 w-full h-20 bg-slate-800 border-b-4 border-slate-900 overflow-hidden flex flex-col justify-end">
          <div className="w-full flex flex-wrap gap-1.5 p-2 opacity-70">
            {/* Tạo khán giả nhấp nháy */}
            {Array.from({ length: 80 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: Math.random() * 2 + 1,
                  repeat: Infinity,
                }}
                className={`w-2.5 h-2.5 rounded-full ${
                  [
                    "bg-red-400",
                    "bg-blue-400",
                    "bg-white",
                    "bg-yellow-300",
                    "bg-purple-400",
                  ][Math.floor(Math.random() * 5)]
                }`}
              />
            ))}
          </div>
        </div>

        {/* Khung thành */}
        <div className="absolute top-20 w-40 h-14 border-4 border-white border-b-0 z-0 flex items-center justify-center">
          {/* Lưới */}
          <div className="w-full h-full bg-net-pattern opacity-40 bg-white/20" />

          {/* Cột dọc trái phải làm đậm lên một chút */}
          <div className="absolute left-[-4px] top-0 w-1 h-full bg-gray-300 shadow-md"></div>
          <div className="absolute right-[-4px] top-0 w-1 h-full bg-gray-300 shadow-md"></div>
        </div>

        {/* Vạch kẻ sân bóng */}
        {/* Vòng 16m50 */}
        <div className="absolute top-20 w-[340px] h-[160px] border-[3px] border-white/80 border-t-0 z-0"></div>

        {/* Vòng 5m50 (Khu vực thủ môn) */}
        <div className="absolute top-20 w-[140px] h-[60px] border-[3px] border-white/80 border-t-0 z-0"></div>

        {/* Cung phạt đền (Bán nguyệt) */}
        <div className="absolute top-[180px] w-32 h-16 border-[3px] border-white/80 border-t-0 rounded-b-full z-0 opacity-80"></div>

        <PenaltySpot />
      </div>
    </div>
  );
}
