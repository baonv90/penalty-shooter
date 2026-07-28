export const JERSEY_COLOR_MAP: Record<string, string> = {
  "bg-red-600": "#dc2626",
  "bg-blue-600": "#2563eb",
  "bg-yellow-400": "#facc15",
  "bg-white": "#ffffff",
  "bg-green-500": "#22c55e",
};

// Cấu hình thời gian animation (giảm tốc độ movement để bóng/cầu thủ đi đằm hơn)
export const GAME_SPEEDS = {
  easy: { ringSpeed: 1.0, ballDuration: 0.8, gkDuration: 0.6 },
  medium: { ringSpeed: 0.65, ballDuration: 0.7, gkDuration: 0.5 },
  hard: { ringSpeed: 0.4, ballDuration: 0.6, gkDuration: 0.4 },
};
