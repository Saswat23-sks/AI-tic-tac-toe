export type Player = 'X' | 'O' | null;
export type Board = Player[];
export type GameMode = '2D' | '3D';

export interface GameState {
  board: Board;
  isXNext: boolean;
}

export interface DifficultyProfile {
  maxDepth: number;
  mistakeChance: number;
}

export const WINNING_COMBINATIONS_2D = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const WINNING_COMBINATIONS_3D = [
  // Within layers
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [9, 10, 11], [12, 13, 14], [15, 16, 17],
  [18, 19, 20], [21, 22, 23], [24, 25, 26],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [9, 12, 15], [10, 13, 16], [11, 14, 17],
  [18, 21, 24], [19, 22, 25], [20, 23, 26],
  [0, 4, 8], [2, 4, 6],
  [9, 13, 17], [11, 13, 15],
  [18, 22, 26], [20, 22, 24],
  // Across layers
  [0, 9, 18], [1, 10, 19], [2, 11, 20],
  [3, 12, 21], [4, 13, 22], [5, 14, 23],
  [6, 15, 24], [7, 16, 25], [8, 17, 26],
  // Diagonals across layers
  [0, 12, 24], [6, 12, 18], [1, 13, 25], [7, 13, 19], [2, 14, 26], [8, 14, 20],
  [0, 10, 20], [2, 10, 18], [3, 13, 23], [5, 13, 21], [6, 16, 26], [8, 16, 18],
  // 3D Main Diagonals
  [0, 13, 26], [2, 13, 24], [6, 13, 20], [8, 13, 18]
];

export const checkWinner = (currentBoard: Board): Player | 'Draw' | null => {
  const combos = currentBoard.length === 9 ? WINNING_COMBINATIONS_2D : WINNING_COMBINATIONS_3D;
  for (const combo of combos) {
    const [a, b, c] = combo;
    if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
      return currentBoard[a];
    }
  }
  if (currentBoard.every(cell => cell !== null)) return 'Draw';
  return null;
};
