import { 
  Board, 
  Player, 
  GameMode, 
  DifficultyProfile, 
  checkWinner, 
  WINNING_COMBINATIONS_2D, 
  WINNING_COMBINATIONS_3D 
} from '../types';

const minimaxMemo = new Map<string, number>();

const evaluateBoard = (currentBoard: Board, difficulty: 'Easy' | 'Medium' | 'Hard'): number => {
  const combos = currentBoard.length === 9 ? WINNING_COMBINATIONS_2D : WINNING_COMBINATIONS_3D;
  let score = 0;
  
  const centerIdx = currentBoard.length === 9 ? 4 : 13;

  // 1. Standard position weights (Center is key)
  if (currentBoard[centerIdx] === 'O') score += 15;
  if (currentBoard[centerIdx] === 'X') score -= 15;

  // 2. Line evaluation and fork detection
  let oForks = 0;
  let xForks = 0;

  for (const combo of combos) {
    const [a, b, c] = combo;
    const cells = [currentBoard[a], currentBoard[b], currentBoard[c]];
    const oCount = cells.filter(c => c === 'O').length;
    const xCount = cells.filter(c => c === 'X').length;

    if (oCount === 3) return 10000;
    if (xCount === 3) return -10000;

    // Easy mode only cares about immediate wins/blocks
    if (difficulty === 'Easy') {
      if (oCount === 2 && xCount === 0) score += 50;
      if (xCount === 2 && oCount === 0) score -= 100;
      continue;
    }

    // Medium/Hard modes use more sophisticated evaluation
    if (oCount === 2 && xCount === 0) {
      score += 100;
      oForks++;
    }
    if (xCount === 2 && oCount === 0) {
      score -= 250; // Block player wins aggressively
      xForks++;
    }
    
    if (oCount === 1 && xCount === 0) score += 10;
    if (xCount === 1 && oCount === 0) score -= 15;
  }

  // Fork detection (only for Medium and Hard)
  if (difficulty !== 'Easy') {
    if (oForks >= 2) score += 600;
    if (xForks >= 2) score -= 1200;
  }
  
  return score;
};

const minimax = (
  currentBoard: Board, 
  depth: number, 
  isMaximizing: boolean, 
  alpha: number, 
  beta: number, 
  maxDepth: number, 
  difficulty: 'Easy' | 'Medium' | 'Hard',
  learningWeights: Record<number, number>
): number => {
  const boardKey = currentBoard.join('') + depth + isMaximizing + difficulty;
  if (minimaxMemo.has(boardKey)) return minimaxMemo.get(boardKey)!;

  const result = checkWinner(currentBoard);
  if (result === 'O') return 10000 - depth;
  if (result === 'X') return depth - 10000;
  if (result === 'Draw') return 0;
  if (depth >= maxDepth) return evaluateBoard(currentBoard, difficulty);

  let score: number;
  const availableMoves = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];

  // Move Ordering: Prioritize center and learned weights
  const centerIdx = currentBoard.length === 9 ? 4 : 13;

  availableMoves.sort((a, b) => {
    let scoreA = (learningWeights[a] || 0) * (difficulty === 'Hard' ? 2 : 1);
    let scoreB = (learningWeights[b] || 0) * (difficulty === 'Hard' ? 2 : 1);
    if (a === centerIdx) scoreA += 50;
    if (b === centerIdx) scoreB += 50;
    return scoreB - scoreA;
  });

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const i of availableMoves) {
      currentBoard[i] = 'O';
      const s = minimax(currentBoard, depth + 1, false, alpha, beta, maxDepth, difficulty, learningWeights);
      currentBoard[i] = null;
      bestScore = Math.max(s, bestScore);
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    score = bestScore;
  } else {
    let bestScore = Infinity;
    for (const i of availableMoves) {
      currentBoard[i] = 'X';
      const s = minimax(currentBoard, depth + 1, true, alpha, beta, maxDepth, difficulty, learningWeights);
      currentBoard[i] = null;
      bestScore = Math.min(s, bestScore);
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
    score = bestScore;
  }
  minimaxMemo.set(boardKey, score);
  return score;
};

export const DIFFICULTY_PROFILES: Record<GameMode, Record<'Easy' | 'Medium' | 'Hard', DifficultyProfile>> = {
  '2D': {
    'Easy': { maxDepth: 1, mistakeChance: 0.3 },
    'Medium': { maxDepth: 4, mistakeChance: 0.1 },
    'Hard': { maxDepth: 9, mistakeChance: 0 }
  },
  '3D': {
    'Easy': { maxDepth: 1, mistakeChance: 0.4 },
    'Medium': { maxDepth: 3, mistakeChance: 0.15 },
    'Hard': { maxDepth: 6, mistakeChance: 0 }
  }
};

export class OpponentAI {
  private learningWeights: Record<number, number>;

  constructor(learningWeights: Record<number, number> = {}) {
    this.learningWeights = learningWeights;
  }

  public getBestMove(
    board: Board, 
    gameMode: GameMode, 
    difficulty: 'Easy' | 'Medium' | 'Hard'
  ): number {
    minimaxMemo.clear();
    const availableMoves = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    
    const profile = DIFFICULTY_PROFILES[gameMode][difficulty];
    const { maxDepth, mistakeChance } = profile;

    // 1. Occasional random move for lower difficulties
    if (Math.random() < mistakeChance) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    let bestScore = -Infinity;
    let move = -1;

    // 2. Find the best move using Minimax
    const currentBoard = [...board];
    
    // Move Ordering: Prioritize center
    const centerIdx = currentBoard.length === 9 ? 4 : 13;
    availableMoves.sort((a, b) => {
      let scoreA = this.learningWeights[a] || 0;
      let scoreB = this.learningWeights[b] || 0;
      if (a === centerIdx) scoreA += 50;
      if (b === centerIdx) scoreB += 50;
      return scoreB - scoreA;
    });

    for (const i of availableMoves) {
      currentBoard[i] = 'O';
      const score = minimax(currentBoard, 0, false, -Infinity, Infinity, maxDepth, difficulty, this.learningWeights);
      currentBoard[i] = null;
      
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  public updateLearning(history: { board: Board }[], winner: Player | 'Draw'): Record<number, number> {
    const newWeights = { ...this.learningWeights };
    history.forEach((state, idx) => {
      if (idx === 0) return;
      const prevBoard = history[idx - 1].board;
      const moveIdx = state.board.findIndex((cell, i) => cell !== prevBoard[i]);
      if (moveIdx !== -1) {
        const weightChange = winner === 'O' ? 5 : winner === 'X' ? -5 : 1;
        newWeights[moveIdx] = (newWeights[moveIdx] || 0) + weightChange;
      }
    });
    this.learningWeights = newWeights;
    return newWeights;
  }
}
