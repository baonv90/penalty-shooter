import { useGameStore } from "../store/gameStore";

export default function PitchBackground() {
  const { isNetBulging } = useGameStore();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#2e7d32] pointer-events-none flex flex-col">
      {/* Các sọc cỏ sân bóng */}
      <div className="absolute inset-0 flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 w-full ${
              i % 2 === 0 ? "bg-[#388e3c]" : "bg-[#2e7d32]"
            }`}
          />
        ))}
      </div>

      {/* Đường biên ngang (Goal Line) */}
      <div className="absolute top-[80px] w-full h-[3px] bg-white/80 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />

      {/* Vòng cấm địa (16.5m Box) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[80px] w-[560px] h-[300px] border-[3px] border-white/80 border-t-0 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />

      {/* Vòng 5m50 (Goal Area) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[80px] w-[300px] h-[100px] border-[3px] border-white/80 border-t-0 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />

      {/* Chấm Penalty */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[280px] w-3 h-3 bg-white rounded-full shadow-md" />

      {/* Vòng bán nguyệt (Penalty Arc) - Nằm chính xác dưới vạch 16m50 */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[380px] w-[130px] h-[45px] border-[3px] border-white/80 border-t-0 rounded-b-[100px] shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />

      {/* Khung thành 3D */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[30px] w-[200px] h-[50px] flex flex-col items-center">
        {/* Xà ngang */}
        <div className="w-full h-3 bg-white rounded-t-sm shadow-xl z-20" />

        <div className="relative w-full flex-1 flex justify-between">
          {/* Cột dọc trái */}
          <div className="w-1 h-full bg-gradient-to-r from-slate-300 to-white shadow-xl z-20" />

          {/* Lưới khung thành với hiệu ứng tung lưới */}
          <div
            className={`absolute inset-0 top-0 bottom-0 bg-slate-900/20 border border-white/30 transition-transform duration-300 ${
              isNetBulging
                ? "scale-1 bg-white/40 shadow-[inset_0_0_40px_rgba(255,255,255,0.9)]"
                : ""
            }`}
          >
            <div
              className="w-full h-full opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .8) 25%, rgba(255, 255, 255, .8) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .8) 75%, rgba(255, 255, 255, .8) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .8) 25%, rgba(255, 255, 255, .8) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .8) 75%, rgba(255, 255, 255, .8) 76%, transparent 77%, transparent)",
                backgroundSize: "15px 15px",
              }}
            />
          </div>

          {/* Cột dọc phải */}
          <div className="w-1 h-full bg-gradient-to-l from-slate-300 to-white shadow-xl z-20" />
        </div>
      </div>
    </div>
  );
}
