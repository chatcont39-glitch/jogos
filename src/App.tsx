/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RefreshCw, 
  Gamepad2, 
  PawPrint, 
  Type, 
  Hash,
  ChevronLeft,
  Star,
  Timer,
  Volume2,
  VolumeX,
  Home
} from 'lucide-react';

// --- Types ---

type Theme = 'alphabet' | 'numbers' | 'animals';

interface Card {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// --- Sound Utility ---

const playSound = (type: 'match' | 'mismatch' | 'win' | 'click', muted: boolean) => {
  if (muted) return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    case 'match':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    case 'mismatch':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.2); // A2
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    case 'win':
      // Short victory melody
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.1, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.2);
      });
      break;
  }
};

// --- Constants ---

const THEME_COLORS = [
  'bg-pink-100 text-pink-500 border-pink-200',
  'bg-blue-100 text-blue-500 border-blue-200',
  'bg-emerald-100 text-emerald-500 border-emerald-200',
  'bg-orange-100 text-orange-500 border-orange-200',
  'bg-purple-100 text-purple-500 border-purple-200',
  'bg-yellow-100 text-yellow-600 border-yellow-200',
  'bg-cyan-100 text-cyan-500 border-cyan-200',
  'bg-indigo-100 text-indigo-500 border-indigo-200',
  'bg-rose-100 text-rose-500 border-rose-200',
  'bg-amber-100 text-amber-600 border-amber-200',
  'bg-lime-100 text-lime-600 border-lime-200',
  'bg-violet-100 text-violet-500 border-violet-200',
];

const THEMES: { id: Theme; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'alphabet', label: 'Alfabeto', icon: <Type className="w-6 h-6" />, color: 'bg-blue-400' },
  { id: 'numbers', label: 'Números', icon: <Hash className="w-6 h-6" />, color: 'bg-emerald-400' },
  { id: 'animals', label: 'Animais', icon: <PawPrint className="w-6 h-6" />, color: 'bg-orange-400' },
];

const PAIR_OPTIONS = [4, 6, 8, 12];

const ANIMAL_EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = Array.from({ length: 20 }, (_, i) => (i + 1).toString());

// --- Helper for consistent coloring ---
const getContentStyle = (content: string) => {
  const charCodeSum = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return THEME_COLORS[charCodeSum % THEME_COLORS.length];
};

// --- Components ---

const CardContent = ({ content, theme }: { content: string; theme: Theme }) => {
  const style = getContentStyle(content);
  
  return (
    <div className={`w-full h-full flex items-center justify-center rounded-2xl border-4 transition-all ${style} shadow-[0_8px_0_0_rgba(0,0,0,0.05)] relative overflow-hidden`}>
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', 
        backgroundSize: '12px 12px' 
      }} />

      <div className="relative">
        {/* White "Sticker" Glow */}
        <div className="absolute inset-0 scale-125 opacity-40 blur-lg bg-white rounded-full" />
        
        <span className={`relative z-10 font-bold ${
          theme === 'animals' ? 'text-5xl md:text-6xl' : 'text-6xl md:text-7xl'
        } drop-shadow-[0_4px_0_rgba(255,255,255,0.8)]`}>
          {content}
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'opening' | 'ready'>('loading');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [theme, setTheme] = useState<Theme>('animals');
  const [numPairs, setNumPairs] = useState<number>(6);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Loading Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setAppState('opening'), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Game
  const initGame = useCallback(() => {
    let contentPool: string[] = [];
    if (theme === 'animals') contentPool = [...ANIMAL_EMOJIS];
    else if (theme === 'alphabet') contentPool = [...ALPHABET];
    else if (theme === 'numbers') contentPool = [...NUMBERS];

    const selectedContent = contentPool.sort(() => Math.random() - 0.5).slice(0, numPairs);
    
    const gameContent = [...selectedContent, ...selectedContent]
      .sort(() => Math.random() - 0.5)
      .map((content, index) => ({
        id: index,
        content,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(gameContent);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setGameState('playing');
    playSound('click', isMuted);
  }, [theme, numPairs, isMuted]);

  // Handle Card Click
  const handleCardClick = (index: number) => {
    if (
      flippedIndices.length === 2 || 
      cards[index].isFlipped || 
      cards[index].isMatched ||
      gameState !== 'playing'
    ) return;

    playSound('click', isMuted);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].content === cards[second].content) {
        // Match found
        setTimeout(() => {
          playSound('match', isMuted);
          setCards(prev => {
            const updated = [...prev];
            updated[first].isMatched = true;
            updated[second].isMatched = true;
            return updated;
          });
          setMatches(m => m + 1);
          setFlippedIndices([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          playSound('mismatch', isMuted);
          setCards(prev => {
            const updated = [...prev];
            updated[first].isFlipped = false;
            updated[second].isFlipped = false;
            return updated;
          });
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Check for Win
  useEffect(() => {
    if (matches === numPairs && numPairs > 0) {
      setTimeout(() => {
        setGameState('finished');
        playSound('win', isMuted);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6321', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
        });
      }, 600);
    }
  }, [matches, numPairs, isMuted]);

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#4A4A4A] font-sans selection:bg-orange-200 overflow-hidden">
      <AnimatePresence mode="wait">
        
        {/* Loading Screen */}
        {appState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-24 h-24 mb-8 text-orange-500"
            >
              <RefreshCw className="w-full h-full" />
            </motion.div>
            <div className="w-full max-w-xs h-3 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-50">
              <motion.div 
                className="h-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="mt-4 font-bold text-orange-500 animate-pulse">Carregando Magia...</p>
          </motion.div>
        )}

        {/* Opening Screen */}
        {appState === 'opening' && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-40 bg-gradient-to-b from-orange-50 to-[#FDFCF0] flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-center space-y-6"
            >
              <div className="relative inline-block">
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="w-40 h-40 bg-orange-400 rounded-[40px] flex items-center justify-center shadow-2xl mx-auto"
                >
                  <Gamepad2 className="text-white w-20 h-20" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white"
                >
                  <Star className="fill-white w-8 h-8" />
                </motion.div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-5xl md:text-7xl font-black text-[#2D2D2D] tracking-tighter">
                  Memória <span className="text-orange-500">Mágica</span>
                </h1>
                <p className="text-xl text-[#666666] font-medium">O jogo mais divertido para aprender!</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSound('click', isMuted);
                  setAppState('ready');
                }}
                className="px-12 py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl font-black text-2xl shadow-xl shadow-orange-200 transition-all"
              >
                VAMOS JOGAR!
              </motion.button>
            </motion.div>

            {/* Floating Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: Math.random() * window.innerHeight,
                    rotate: Math.random() * 360
                  }}
                  animate={{ 
                    y: [null, Math.random() * -100, Math.random() * 100],
                    rotate: [null, Math.random() * 360]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 5 + Math.random() * 5, 
                    ease: "linear" 
                  }}
                  className="absolute text-4xl"
                >
                  {['⭐', '🎈', '🎨', '🧩', '🧸'][i % 5]}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Game App */}
        {appState === 'ready' && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col min-h-screen"
          >
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-400 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                  <Gamepad2 className="text-white w-7 h-7" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2D2D]">
                  Memória Mágica
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-full bg-white border-2 border-[#E5E5E5] hover:border-orange-300 transition-colors shadow-sm"
                  title={isMuted ? "Ativar som" : "Desativar som"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                {gameState !== 'menu' && (
                  <button 
                    onClick={() => setGameState('menu')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#E5E5E5] hover:border-orange-300 transition-colors font-medium text-sm shadow-sm"
                    id="back-to-menu-btn"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Menu
                  </button>
                )}
              </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                
                {/* Menu Screen */}
                {gameState === 'menu' && (
                  <motion.div 
                    key="menu"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full max-w-md space-y-8"
                  >
                    <div className="bg-white p-8 rounded-[32px] shadow-xl border-2 border-[#F0F0F0] space-y-8">
                      
                      {/* Theme Selection */}
                      <section className="space-y-4">
                        <label className="text-xs uppercase tracking-widest font-bold text-[#9E9E9E] ml-1">
                          Escolha o Tema
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {THEMES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setTheme(t.id)}
                              className={`flex items-center gap-4 p-4 rounded-2xl border-4 transition-all text-left relative overflow-hidden ${
                                theme === t.id 
                                  ? `border-${t.color.split('-')[1]}-400 bg-${t.color.split('-')[1]}-50 shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]` 
                                  : 'border-[#F0F0F0] hover:border-gray-300 bg-white shadow-[0_4px_0_rgb(240,240,240)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(240,240,240)] active:translate-y-[4px] active:shadow-none'
                              }`}
                              id={`theme-btn-${t.id}`}
                            >
                              <div className={`w-12 h-12 ${t.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                                {t.icon}
                              </div>
                              <span className="font-bold text-lg">{t.label}</span>
                              {theme === t.id && <Star className="ml-auto w-5 h-5 text-orange-400 fill-orange-400" />}
                            </button>
                          ))}
                        </div>
                      </section>

                      {/* Pairs Selection */}
                      <section className="space-y-4">
                        <label className="text-xs uppercase tracking-widest font-bold text-[#9E9E9E] ml-1">
                          Número de Pares
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {PAIR_OPTIONS.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setNumPairs(opt)}
                              className={`py-3 rounded-2xl border-4 font-black transition-all ${
                                numPairs === opt
                                  ? 'border-orange-400 bg-orange-50 text-orange-600 shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]'
                                  : 'border-[#F0F0F0] hover:border-gray-300 bg-white shadow-[0_4px_0_rgb(240,240,240)] hover:translate-y-[2px] hover:shadow-[0_2px_0_rgb(240,240,240)] active:translate-y-[4px] active:shadow-none'
                              }`}
                              id={`pairs-btn-${opt}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </section>

                      <button
                        onClick={initGame}
                        className="w-full py-5 bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-3xl font-black text-xl shadow-[0_8px_0_rgb(204,82,41)] hover:shadow-[0_4px_0_rgb(204,82,41)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3"
                        id="start-game-btn"
                      >
                        <Gamepad2 className="w-6 h-6" />
                        Começar Jogo!
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Playing Screen */}
                {gameState === 'playing' && (
                  <motion.div 
                    key="playing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="w-full space-y-6"
                  >
                    {/* Stats */}
                    <div className="flex justify-center gap-6 md:gap-12 mb-4">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#9E9E9E]">Tempo</p>
                        <div className="flex items-center gap-1 justify-center">
                          <Timer className="w-4 h-4 text-blue-500" />
                          <p className="text-2xl font-black text-blue-500 tabular-nums">{formatTime(seconds)}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#9E9E9E]">Movimentos</p>
                        <p className="text-2xl font-black text-orange-500">{moves}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#9E9E9E]">Pares</p>
                        <p className="text-2xl font-black text-emerald-500">{matches} / {numPairs}</p>
                      </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 gap-3 md:gap-4 mx-auto max-w-2xl">
                      {cards.map((card, idx) => (
                        <div
                          key={card.id}
                          onClick={() => handleCardClick(idx)}
                          className="aspect-square perspective-1000 cursor-pointer group"
                          id={`card-${idx}`}
                        >
                          <motion.div
                            className="relative w-full h-full transition-all duration-500 preserve-3d"
                            animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                          >
                            {/* Front (Hidden) */}
                            <div className="absolute inset-0 backface-hidden bg-white border-2 border-[#E5E5E5] rounded-2xl flex items-center justify-center shadow-sm group-hover:border-orange-200 transition-colors">
                              <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
                                <Star className="w-4 h-4 text-orange-200" />
                              </div>
                            </div>
                            
                            {/* Back (Visible) */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                              <CardContent content={card.content} theme={theme} />
                              {card.isMatched && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20"
                                >
                                  <Star className="w-3 h-3 text-white fill-white" />
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center pt-8">
                      <button 
                        onClick={initGame}
                        className="group flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-[#4A4A4A] border-4 border-[#F0F0F0] rounded-3xl font-black text-lg shadow-[0_8px_0_rgb(229,229,229)] hover:shadow-[0_4px_0_rgb(229,229,229)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all"
                        id="restart-btn"
                      >
                        <RefreshCw className="w-6 h-6 text-orange-500 group-hover:rotate-180 transition-transform duration-500" />
                        Reiniciar Jogo
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Finished Screen */}
                {gameState === 'finished' && (
                  <motion.div 
                    key="finished"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-10 py-4"
                  >
                    <div className="relative inline-block">
                      <motion.div 
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="w-40 h-40 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-[48px] flex items-center justify-center shadow-2xl mx-auto relative overflow-hidden"
                      >
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3], x: [-100, 100] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-white/30 skew-x-12"
                        />
                        <Trophy className="text-white w-20 h-20 drop-shadow-lg" />
                      </motion.div>
                      
                      {/* Floating Stars */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: [0, 1, 0.8], 
                            opacity: [0, 1, 0.8],
                            y: [-20, -40 - (i * 10)],
                            x: [0, (i - 1) * 30]
                          }}
                          transition={{ delay: 0.2 + (i * 0.1), duration: 1, repeat: Infinity, repeatDelay: 1 }}
                          className="absolute top-0 left-1/2"
                        >
                          <Star className="fill-yellow-400 text-yellow-500 w-8 h-8" />
                        </motion.div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <motion.h2 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-black text-[#2D2D2D] tracking-tight"
                      >
                        Parabéns!
                      </motion.h2>
                      
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-2 gap-4 max-w-sm mx-auto"
                      >
                        <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-100">
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Tempo</p>
                          <p className="text-2xl font-black text-blue-600">{formatTime(seconds)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-3xl border-2 border-orange-100">
                          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Movimentos</p>
                          <p className="text-2xl font-black text-orange-600">{moves}</p>
                        </div>
                      </motion.div>
                    </div>

                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-col gap-4 max-w-xs mx-auto"
                    >
                      <button
                        onClick={initGame}
                        className="group w-full py-5 bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-3xl font-black text-xl shadow-[0_8px_0_rgb(204,82,41)] hover:shadow-[0_4px_0_rgb(204,82,41)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3"
                        id="play-again-btn"
                      >
                        <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                        Jogar de Novo
                      </button>
                      
                      <button
                        onClick={() => setGameState('menu')}
                        className="w-full py-5 bg-white hover:bg-gray-50 text-[#4A4A4A] border-4 border-[#F0F0F0] rounded-3xl font-black text-xl shadow-[0_8px_0_rgb(229,229,229)] hover:shadow-[0_4px_0_rgb(229,229,229)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-3"
                        id="menu-btn"
                      >
                        <Home className="w-6 h-6" />
                        Início
                      </button>
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="mt-12 text-center">
              <p className="text-xs text-[#9E9E9E] font-medium tracking-widest uppercase">
                Aprender é Divertido!
              </p>
            </footer>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
