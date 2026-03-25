/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, User, Cpu, Trophy, Hash, Volume2, VolumeX, Zap, Brain, Activity, BarChart2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type Player = 'X' | 'O' | null;
type Board = Player[];

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

const checkWinner = (currentBoard: Board): Player | 'Draw' | null => {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
      return currentBoard[a];
    }
  }
  if (currentBoard.every(cell => cell !== null)) return 'Draw';
  return null;
};

const minimax = (currentBoard: Board, depth: number, isMaximizing: boolean): number => {
  const result = checkWinner(currentBoard);
  if (result === 'O') return 10 - depth;
  if (result === 'X') return depth - 10;
  if (result === 'Draw') return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, depth + 1, false);
        currentBoard[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'X';
        const score = minimax(currentBoard, depth + 1, true);
        currentBoard[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

export default function App() {
  const [history, setHistory] = useState<{ board: Board, isXNext: boolean }[]>([
    { board: Array(9).fill(null), isXNext: true }
  ]);
  const [stepNumber, setStepNumber] = useState(0);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Hard');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState(false);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [aiStreak, setAiStreak] = useState(0);
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, number>>({});
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    maxStreak: 0
  });

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('ttt-ai-stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error('Failed to parse stats', e);
      }
    }
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ttt-ai-stats', JSON.stringify(stats));
  }, [stats]);
  
  const current = history[stepNumber];
  const board = current.board;
  const isXNext = current.isXNext;
  
  const winner = checkWinner(board);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const updateKnowledge = useCallback((gameHistory: { board: Board, isXNext: boolean }[], result: Player | 'Draw') => {
    // Update overall stats
    setStats(prev => {
      const next = { ...prev };
      if (result === 'X') {
        next.wins += 1;
        const currentStreak = playerStreak + 1;
        if (currentStreak > next.maxStreak) {
          next.maxStreak = currentStreak;
        }
      } else if (result === 'O') {
        next.losses += 1;
      } else if (result === 'Draw') {
        next.draws += 1;
      }
      return next;
    });

    setKnowledgeBase(prev => {
      const next = { ...prev };
      const reward = result === 'O' ? 1 : result === 'X' ? -1 : 0.1;
      
      // Only learn from AI moves (where isXNext was false before the move)
      for (let i = 1; i < gameHistory.length; i++) {
        const prevState = gameHistory[i-1];
        if (!prevState.isXNext) {
          const stateKey = prevState.board.map(b => b || '-').join('');
          const moveIndex = gameHistory[i].board.findIndex((val, idx) => val !== prevState.board[idx]);
          const key = `${stateKey}:${moveIndex}`;
          next[key] = (next[key] || 0) + reward;
        }
      }
      return next;
    });
  }, []);

  const playSound = useCallback((type: 'place' | 'win' | 'lose' | 'draw') => {
    if (!soundEnabled) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'place':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'win':
        osc.type = 'triangle';
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
        });
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'lose':
        osc.type = 'sawtooth';
        [392.00, 349.23, 311.13].forEach((freq, i) => {
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
        });
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'draw':
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.setValueAtTime(0, now + 0.1);
        gain.gain.setValueAtTime(0.05, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
    }
  }, [soundEnabled]);

  const getBestMove = useCallback((currentBoard: Board): number => {
    const availableMoves = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    
    if (difficulty === 'Easy') {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    if (difficulty === 'Medium') {
      // Medium: 50% chance of best move, 50% chance of random move
      if (Math.random() > 0.5) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
      }
    }

    let bestScore = -Infinity;
    let moves: number[] = [];
    const stateKey = currentBoard.map(b => b || '-').join('');

    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        
        if (score > bestScore) {
          bestScore = score;
          moves = [i];
        } else if (score === bestScore) {
          moves.push(i);
        }
      }
    }

    // Adaptive Tie-Breaking: Use knowledge base to pick the move that has historically led to better outcomes
    if (moves.length > 1) {
      return moves.sort((a, b) => {
        const scoreA = knowledgeBase[`${stateKey}:${a}`] || 0;
        const scoreB = knowledgeBase[`${stateKey}:${b}`] || 0;
        return scoreB - scoreA;
      })[0];
    }

    return moves[0] ?? -1;
  }, [difficulty, knowledgeBase]);

  const handleClick = (index: number) => {
    if (board[index] || winner || !isXNext) return;

    playSound('place');
    const newBoard = [...board];
    newBoard[index] = 'X';
    
    const newHistory = history.slice(0, stepNumber + 1);
    const gameResult = checkWinner(newBoard);
    
    setHistory([...newHistory, { board: newBoard, isXNext: false }]);
    setStepNumber(newHistory.length);

    if (gameResult === 'X') {
      playSound('win');
      setPlayerStreak(s => s + 1);
      setAiStreak(0);
      updateKnowledge([...newHistory, { board: newBoard, isXNext: false }], 'X');
    } else if (gameResult === 'Draw') {
      playSound('draw');
      setPlayerStreak(0);
      setAiStreak(0);
      updateKnowledge([...newHistory, { board: newBoard, isXNext: false }], 'Draw');
    }
  };

  useEffect(() => {
    if (!isXNext && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove([...board]);
        if (aiMove !== -1) {
          playSound('place');
          const newBoard = [...board];
          newBoard[aiMove] = 'O';
          
          const newHistory = history.slice(0, stepNumber + 1);
          const gameResult = checkWinner(newBoard);
          const fullHistory = [...newHistory, { board: newBoard, isXNext: true }];
          
          setHistory(fullHistory);
          setStepNumber(newHistory.length);

          if (gameResult === 'O') {
            playSound('lose');
            setAiStreak(s => s + 1);
            setPlayerStreak(0);
            updateKnowledge(fullHistory, 'O');
          } else if (gameResult === 'Draw') {
            playSound('draw');
            setAiStreak(0);
            setPlayerStreak(0);
            updateKnowledge(fullHistory, 'Draw');
          }
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board, getBestMove, playSound, history, stepNumber, updateKnowledge]);

  const resetGame = () => {
    setHistory([{ board: Array(9).fill(null), isXNext: true }]);
    setStepNumber(0);
  };

  const jumpTo = (step: number) => {
    setStepNumber(step);
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans flex flex-col items-center justify-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="flex justify-end gap-4 mb-8">
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`p-3 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md transition-all duration-300 ${showStats ? 'text-cyan-400 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'text-slate-400 hover:text-cyan-400 hover:border-slate-700'}`}
            title="Overall Statistics"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-3 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md transition-all duration-300 ${showHistory ? 'text-cyan-400 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'text-slate-400 hover:text-cyan-400 hover:border-slate-700'}`}
            title="Game History"
          >
            <RefreshCw className={`w-5 h-5 ${showHistory ? 'rotate-180' : ''} transition-transform duration-500`} />
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-all duration-300"
            title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        <header className="text-center mb-12">
          <motion.div 
            initial={{ y: 0 }}
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center gap-4 mb-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Hash className="text-cyan-400 w-10 h-10" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic text-white leading-none">
              Tic-Tac-Toe <motion.span 
                animate={{ 
                  textShadow: [
                    "0 0 0px rgba(34,211,238,0)",
                    "0 0 15px rgba(34,211,238,0.6)",
                    "0 0 0px rgba(34,211,238,0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-cyan-400"
              >AI</motion.span>
            </h1>
          </motion.div>
          <p className="text-slate-400 text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] opacity-80">
            Challenge the Minimax Algorithm
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                  className="w-1 h-1 rounded-full bg-cyan-400"
                />
              ))}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60">
              Adaptive Learning Active ({Object.keys(knowledgeBase).length} patterns)
            </span>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 relative ${isXNext ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-800 bg-slate-900/50'}`}>
            <User className={`w-6 h-6 ${isXNext ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">Player (X)</span>
            {playerStreak > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-cyan-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1"
              >
                <Trophy className="w-2.5 h-2.5" /> {playerStreak} STREAK
              </motion.div>
            )}
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 relative ${!isXNext ? 'border-rose-400 bg-rose-400/10 shadow-[0_0_15px_rgba(251,113,133,0.2)]' : 'border-slate-800 bg-slate-900/50'}`}>
            <Cpu className={`w-6 h-6 ${!isXNext ? 'text-rose-400' : 'text-slate-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">AI (O)</span>
            {aiStreak > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-rose-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1"
              >
                <Trophy className="w-2.5 h-2.5" /> {aiStreak} STREAK
              </motion.div>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
            <div className="grid grid-cols-3 gap-3 relative z-10">
              {board.map((cell, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: cell ? 1 : 1.02 }}
                  whileTap={{ scale: cell ? 1 : 0.95 }}
                  onClick={() => handleClick(i)}
                  className={`h-24 sm:h-28 rounded-2xl flex items-center justify-center text-4xl font-black transition-colors duration-200 ${
                    cell === 'X' ? 'text-cyan-400 bg-cyan-400/5' : 
                    cell === 'O' ? 'text-rose-400 bg-rose-400/5' : 
                    'bg-slate-800/50 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {cell && (
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      >
                        {cell}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {winner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                >
                  <Trophy className={`w-16 h-16 mb-4 ${winner === 'X' ? 'text-cyan-400' : winner === 'O' ? 'text-rose-400' : 'text-slate-400'}`} />
                  <h2 className="text-3xl font-black uppercase italic mb-2">
                    {winner === 'Draw' ? "It's a Draw!" : `${winner === 'X' ? 'You' : 'AI'} Won!`}
                  </h2>
                  <p className="text-slate-400 mb-6 font-mono text-sm">
                    {winner === 'O' ? "The algorithm was too strong." : winner === 'X' ? "Impressive victory!" : "A perfect balance."}
                  </p>
                  <button
                    onClick={resetGame}
                    className="bg-white text-slate-950 px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> New Game
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-0 right-[-180px] w-40 h-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-4 hidden lg:flex flex-col gap-2 overflow-y-auto"
              >
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 border-bottom border-slate-800 pb-2">History</h3>
                {history.map((_, step) => (
                  <button
                    key={step}
                    onClick={() => jumpTo(step)}
                    className={`text-[10px] font-bold uppercase tracking-tighter py-2 px-3 rounded-xl transition-all text-left ${
                      step === stepNumber 
                        ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {step === 0 ? 'Start' : `Move #${step}`}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden w-full mt-4 bg-slate-900 rounded-2xl border border-slate-800 p-4 overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {history.map((_, step) => (
                  <button
                    key={step}
                    onClick={() => jumpTo(step)}
                    className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter py-2 px-4 rounded-full transition-all ${
                      step === stepNumber 
                        ? 'bg-cyan-400 text-slate-950' 
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step === 0 ? 'Start' : `#${step}`}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Select Difficulty</span>
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 relative">
              {(['Easy', 'Medium', 'Hard'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    if (difficulty !== lvl) {
                      setDifficulty(lvl);
                      resetGame();
                    }
                  }}
                  className={`relative z-10 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 flex items-center gap-2 ${
                    difficulty === lvl ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {lvl === 'Easy' ? <Zap className="w-3.5 h-3.5" /> : lvl === 'Medium' ? <Activity className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                  {lvl}
                </button>
              ))}
              <motion.div
                className="absolute top-1.5 bottom-1.5 bg-slate-700 rounded-xl shadow-lg"
                initial={false}
                animate={{
                  left: difficulty === 'Easy' ? '6px' : difficulty === 'Medium' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 2px)',
                  width: 'calc(33.33% - 6px)'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </div>
          </div>
          
          <button
            onClick={resetGame}
            className="group text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> 
            Reset Board
          </button>
        </footer>
      </motion.div>

      {/* Statistics Modal */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowStats(false)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <BarChart2 className="text-cyan-400 w-8 h-8" />
                <h2 className="text-2xl font-black uppercase italic text-white">Overall Stats</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Total Games</span>
                  <span className="text-2xl font-black text-white">{stats.wins + stats.losses + stats.draws}</span>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Max Win Streak</span>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cyan-400" />
                    <span className="text-2xl font-black text-white">{stats.maxStreak}</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Wins', value: stats.wins },
                        { name: 'Losses', value: stats.losses },
                        { name: 'Draws', value: stats.draws }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#22d3ee" /> {/* Cyan 400 - Wins */}
                      <Cell fill="#fb7185" /> {/* Rose 400 - Losses */}
                      <Cell fill="#94a3b8" /> {/* Slate 400 - Draws */}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Win Rate', value: stats.wins + stats.losses + stats.draws > 0 ? ((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100).toFixed(1) : 0, color: 'bg-cyan-400' },
                  { label: 'Loss Rate', value: stats.wins + stats.losses + stats.draws > 0 ? ((stats.losses / (stats.wins + stats.losses + stats.draws)) * 100).toFixed(1) : 0, color: 'bg-rose-400' },
                  { label: 'Draw Rate', value: stats.wins + stats.losses + stats.draws > 0 ? ((stats.draws / (stats.wins + stats.losses + stats.draws)) * 100).toFixed(1) : 0, color: 'bg-slate-400' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-white">{item.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
