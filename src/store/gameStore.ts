import { create } from "zustand";

export type ShotResult = "goal" | "miss" | "post";
export type Player = {
  id: number;
  name: string;
  jerseyColor: string;
  shots: ShotResult[];
};
export type Difficulty = "easy" | "medium" | "hard";
export type BallType = "standard" | "classic" | "modern";
export type ShootMethod = "button" | "voice";
export const AVAILABLE_COLORS = [
  "red-600",
  "blue-600",
  "yellow-400",
  "white",
  "green-500",
];

interface GameState {
  players: Player[];
  turn: 0 | 1;
  difficulty: Difficulty;
  ballType: BallType;
  shootMethod: ShootMethod;
  isShooting: boolean;
  gamePhase: "menu" | "playing" | "gameover";
  winner: number | null;
  isNetBulging: boolean;

  setShooting: (status: boolean) => void;
  setNetBulge: (status: boolean) => void;
  recordShot: (result: ShotResult) => void;
  updateSettings: (
    diff: Difficulty,
    ball: BallType,
    method: ShootMethod
  ) => void;
  startGame: () => void;
  setPlayerColor: (playerIndex: number, color: string) => void;
  setPlayerName: (playerIndex: number, name: string) => void;
  resetGame: () => void;
}

const checkWinner = (
  p1Shots: ShotResult[],
  p2Shots: ShotResult[]
): number | null => {
  const p1Score = p1Shots.filter((s) => s === "goal").length;
  const p2Score = p2Shots.filter((s) => s === "goal").length;
  const p1Left = Math.max(0, 5 - p1Shots.length);
  const p2Left = Math.max(0, 5 - p2Shots.length);

  if (p1Shots.length <= 5 && p2Shots.length <= 5) {
    if (p1Score + p1Left < p2Score) return 2;
    if (p2Score + p2Left < p1Score) return 1;
  } else {
    if (p1Shots.length === p2Shots.length) {
      if (p1Score > p2Score) return 1;
      if (p2Score > p1Score) return 2;
    }
  }
  return null;
};

export const useGameStore = create<GameState>((set) => ({
  players: [
    { id: 1, name: "Liam", jerseyColor: AVAILABLE_COLORS[0], shots: [] },
    { id: 2, name: "Bao", jerseyColor: AVAILABLE_COLORS[1], shots: [] },
  ],
  turn: 0,
  difficulty: "medium",
  ballType: "standard",
  shootMethod: "button",
  isShooting: false,
  gamePhase: "menu",
  winner: null,
  isNetBulging: false,

  setShooting: (status) => set({ isShooting: status }),
  setNetBulge: (status) => set({ isNetBulging: status }),

  recordShot: (result) =>
    set((state) => {
      const newPlayers = [...state.players];
      newPlayers[state.turn].shots.push(result);
      const win = checkWinner(newPlayers[0].shots, newPlayers[1].shots);
      return {
        players: newPlayers,
        turn: state.turn === 0 ? 1 : 0,
        isShooting: false,
        winner: win,
        gamePhase: win ? "gameover" : "playing",
      };
    }),

  updateSettings: (difficulty, ballType, shootMethod) =>
    set((state) => ({
      difficulty,
      ballType,
      shootMethod,
      players: [...state.players],
    })),

  startGame: () =>
    set((state) => ({
      gamePhase: "playing",
      isShooting: false,
      turn: 0,
      winner: null,
      players: state.players.map((p) => ({ ...p, shots: [] })),
    })),

  // Thêm logic này vào function setPlayerColor trong store của bạn
  setPlayerColor: (playerIndex: number, color: string) =>
    set((state) => {
      const newPlayers = [...state.players];
      const opponentIndex = playerIndex === 0 ? 1 : 0;

      newPlayers[playerIndex].jerseyColor = color;

      // Xử lý đụng màu: Nếu màu chọn trùng với đối thủ, đổi màu đối thủ sang màu khả dụng khác
      if (color === newPlayers[opponentIndex].jerseyColor) {
        const fallbackColor =
          AVAILABLE_COLORS.find((c) => c !== color) || AVAILABLE_COLORS[0];
        newPlayers[opponentIndex].jerseyColor = fallbackColor;
      }

      return { players: newPlayers };
    }),

  setPlayerName: (playerIndex: number, name: string) =>
    set((state) => {
      const newPlayers = [...state.players];
      newPlayers[playerIndex].name = name;
      return { players: newPlayers };
    }),

  resetGame: () =>
    set((state) => ({
      gamePhase: "menu",
      turn: 0,
      winner: null,
      players: state.players.map((p) => ({ ...p, shots: [] })),
    })),
}));
