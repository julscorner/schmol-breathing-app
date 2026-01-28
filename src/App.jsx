import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Home, RefreshCw } from 'lucide-react';

// Priorité 2: Constantes hoistées (évite recréation à chaque render)
const TIMINGS = {
  balanced: { inhale: 4000, hold1: 4000, exhale: 4000, hold2: 4000 },
  longExhale: { inhale: 4000, hold1: 500, exhale: 8000, hold2: 500 }
};

const PHASES_PER_CYCLE = 4;
const MIN_RADIUS = 30;
const MAX_RADIUS = 120;
const MIN_AREA = MIN_RADIUS * MIN_RADIUS;
const MAX_AREA = MAX_RADIUS * MAX_RADIUS;

// Fonction ease-in-out hoistée
const easeInOut = (t) => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// Génération des étoiles hoistée (ne change jamais)
const generateStars = () => {
  const starArray = [];
  
  for (let i = 0; i < 110; i++) {
    starArray.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      twinkle: false,
      layer: 'far'
    });
  }
  
  for (let i = 0; i < 40; i++) {
    starArray.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1.5,
      baseOpacity: Math.random() * 0.4 + 0.3,
      twinkle: true,
      twinkleSpeed: Math.random() * 4000 + 3000,
      twinkleOffset: Math.random() * Math.PI * 2,
      layer: 'near'
    });
  }
  
  return starArray;
};

const STARS = generateStars();

// Styles focus hoistés
const FOCUS_STYLES = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

const App = () => {
  // États essentiels seulement (réduit de 19 à 10)
  const [appState, setAppState] = useState('idle'); // 'idle' | 'breathing' | 'paused' | 'fadingOut' | 'endScreen'
  const [technique, setTechnique] = useState('balanced');
  const [duration, setDuration] = useState(60);
  
  // Priorité 1: Utiliser useRef pour les valeurs qui changent souvent (évite re-renders)
  const animationDataRef = useRef({
    phase: 'idle',
    phaseIndex: 0,
    circleRadius: MIN_RADIUS,
    circleOpacity: 0.15,
    cycleCount: 0,
    elapsedTime: 0,
    phaseProgress: 0
  });
  
  // État pour forcer le re-render de l'animation (mis à jour via RAF)
  const [, forceRender] = useState(0);
  
  // Accessibilité : détecter prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  // Refs pour l'animation
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const totalPausedRef = useRef(0);
  const fadeTimeoutRef = useRef(null);
  const lastCycleRef = useRef(-1);

  // Priorité 2: Timings dérivés (pas de useCallback nécessaire)
  const timings = TIMINGS[technique];
  const cycleTime = timings.inhale + timings.hold1 + timings.exhale + timings.hold2;

  // Priorité 2: Valeur dérivée au lieu de useState + useEffect
  const totalCycles = useMemo(() => 
    Math.ceil((duration * 1000) / cycleTime), 
    [duration, cycleTime]
  );

  const playChime = useCallback(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const baseFreq = 528;
    
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, audioContext.currentTime + 4);
    gain1.gain.setValueAtTime(0.12, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 4);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 4);
    
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, audioContext.currentTime + 3);
    gain2.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 3);
    osc2.start(audioContext.currentTime);
    osc2.stop(audioContext.currentTime + 3);
    
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.connect(gain3);
    gain3.connect(audioContext.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.05);
    gain3.gain.setValueAtTime(0.04, audioContext.currentTime + 0.05);
    gain3.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);
    osc3.start(audioContext.currentTime + 0.05);
    osc3.stop(audioContext.currentTime + 2.5);
  }, []);

  // Priorité 2: Callbacks avec functional setState
  const startBreathing = useCallback(() => {
    lastCycleRef.current = -1;
    startTimeRef.current = performance.now();
    pausedAtRef.current = null;
    totalPausedRef.current = 0;
    animationDataRef.current = {
      phase: 'inhale',
      phaseIndex: 0,
      circleRadius: MIN_RADIUS,
      circleOpacity: 0.15,
      cycleCount: 0,
      elapsedTime: 0,
      phaseProgress: 0
    };
    setAppState('breathing');
  }, []);

  const pauseBreathing = useCallback(() => {
    setAppState(prev => {
      if (prev === 'breathing') {
        pausedAtRef.current = performance.now();
        return 'paused';
      } else if (prev === 'paused') {
        if (pausedAtRef.current) {
          totalPausedRef.current += performance.now() - pausedAtRef.current;
        }
        pausedAtRef.current = null;
        return 'breathing';
      }
      return prev;
    });
  }, []);

  const resetBreathing = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    lastCycleRef.current = -1;
    animationDataRef.current = {
      phase: 'idle',
      phaseIndex: 0,
      circleRadius: MIN_RADIUS,
      circleOpacity: 0.15,
      cycleCount: 0,
      elapsedTime: 0,
      phaseProgress: 0
    };
    setAppState('idle');
  }, []);

  // Animation principale optimisée
  useEffect(() => {
    if (appState !== 'breathing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (now) => {
      const totalElapsed = now - startTimeRef.current - totalPausedRef.current;
      const cyclePosition = totalElapsed % cycleTime;
      const exhaleEnd = timings.inhale + timings.hold1 + timings.exhale;
      const isAtExhaleEnd = cyclePosition >= exhaleEnd - 100 && cyclePosition <= exhaleEnd + 100;
      
      // Terminer sur expiration
      if (totalElapsed >= duration * 1000 && isAtExhaleEnd) {
        playChime();
        setAppState('fadingOut');
        fadeTimeoutRef.current = setTimeout(() => {
          setAppState('endScreen');
        }, 10000);
        return;
      }

      let currentPhase;
      let currentPhaseIndex;
      let linearProgress;
      let sizeProgress;
      
      if (cyclePosition < timings.inhale) {
        currentPhase = 'inhale';
        currentPhaseIndex = 0;
        linearProgress = cyclePosition / timings.inhale;
        sizeProgress = easeInOut(linearProgress);
      } else if (cyclePosition < timings.inhale + timings.hold1) {
        currentPhase = 'hold1';
        currentPhaseIndex = 1;
        linearProgress = (cyclePosition - timings.inhale) / timings.hold1;
        sizeProgress = 1;
      } else if (cyclePosition < timings.inhale + timings.hold1 + timings.exhale) {
        currentPhase = 'exhale';
        currentPhaseIndex = 2;
        linearProgress = (cyclePosition - timings.inhale - timings.hold1) / timings.exhale;
        sizeProgress = 1 - easeInOut(linearProgress);
      } else {
        currentPhase = 'hold2';
        currentPhaseIndex = 3;
        linearProgress = (cyclePosition - timings.inhale - timings.hold1 - timings.exhale) / timings.hold2;
        sizeProgress = 0;
      }

      // Calcul du rayon basé sur l'aire
      const currentArea = MIN_AREA + sizeProgress * (MAX_AREA - MIN_AREA);
      const radius = Math.sqrt(currentArea);

      // Calcul de l'opacité
      let opacity = 0.25 + sizeProgress * 0.35;
      if (currentPhase === 'hold1' || currentPhase === 'hold2') {
        const pulsePhase = linearProgress * Math.PI * 2;
        opacity += Math.sin(pulsePhase) * 0.08;
      }

      // Mise à jour du ref (pas de re-render)
      animationDataRef.current = {
        phase: currentPhase,
        phaseIndex: currentPhaseIndex,
        circleRadius: radius,
        circleOpacity: Math.max(0.2, Math.min(0.65, opacity)),
        cycleCount: Math.floor(totalElapsed / cycleTime) + 1,
        elapsedTime: totalElapsed,
        phaseProgress: linearProgress
      };

      // Force un seul re-render par frame
      forceRender(n => n + 1);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [appState, duration, timings, cycleTime, playChime]);

  // Animation idle
  const [idlePulse, setIdlePulse] = useState(0);
  useEffect(() => {
    if (appState === 'idle' && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setIdlePulse(p => (p + 0.012) % (Math.PI * 2));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [appState, prefersReducedMotion]);

  // Animation shimmer bouton
  const [buttonShimmer, setButtonShimmer] = useState(0);
  useEffect(() => {
    if (appState === 'idle' && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setButtonShimmer(s => (s + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [appState, prefersReducedMotion]);

  // Animation étoiles
  const [starTime, setStarTime] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setStarTime(t => t + 50);
    }, 50);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Getters dérivés
  const getPhaseText = () => {
    const phase = animationDataRef.current.phase;
    if (phase === 'idle') return appState === 'endScreen' ? '' : 'Ready';
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    if (phase === 'hold1') {
      // Après inhale : en mode longExhale, garder "Inhale", sinon "Hold"
      return technique === 'longExhale' ? 'Inhale' : 'Hold';
    }
    if (phase === 'hold2') {
      // Après exhale : en mode longExhale, garder "Exhale", sinon "Hold"
      return technique === 'longExhale' ? 'Exhale' : 'Hold';
    }
    return '';
  };

  const getIdleCircleProps = () => {
    if (appState === 'endScreen') {
      return { radius: 30, opacity: 0 };
    }
    if (prefersReducedMotion) {
      return { radius: 55, opacity: 0.65 };
    }
    const pulse = 0.5 + Math.sin(idlePulse) * 0.12;
    return {
      radius: 30 + pulse * 50,
      opacity: 0.55 + Math.sin(idlePulse) * 0.12
    };
  };

  // Rendu des perles
  const renderPearls = () => {
    const elements = [];
    const radius = 160;
    const totalPearls = totalCycles * PHASES_PER_CYCLE;
    const { elapsedTime, phaseIndex, phaseProgress } = animationDataRef.current;
    
    const currentCycle = Math.floor(elapsedTime / cycleTime);
    const activePearlIndex = currentCycle * PHASES_PER_CYCLE + phaseIndex;
    const completedPearls = activePearlIndex;
    
    const isLongExhale = technique === 'longExhale';
    
    for (let i = 0; i < totalPearls; i++) {
      const angle = (i / totalPearls) * 360;
      const radian = ((angle - 90) * Math.PI) / 180;
      const x = 200 + radius * Math.cos(radian);
      const y = 200 + radius * Math.sin(radian);
      
      const phaseType = i % 4;
      const isHold = phaseType === 1 || phaseType === 3;
      const isMainPhase = phaseType === 0 || phaseType === 2;
      
      let baseSize = isMainPhase ? 8 : (isLongExhale ? 1 : 5);
      
      const isCompletedPearl = i < completedPearls;
      const isActive = i === activePearlIndex;
      
      let currentSize = baseSize;
      let currentOpacity;
      
      if (isLongExhale && isHold) {
        if (isCompletedPearl) {
          currentOpacity = 0.2;
        } else if (isActive) {
          currentOpacity = 0.1 + phaseProgress * 0.15;
          currentSize = baseSize + phaseProgress * 0.5;
        } else {
          currentOpacity = 0.1;
        }
      } else {
        currentOpacity = isCompletedPearl ? 0.35 : (isActive ? 0.45 : 0.15);
        
        if (isActive && !prefersReducedMotion) {
          const pulse = Math.sin(phaseProgress * Math.PI);
          currentSize = baseSize + pulse * 2;
          currentOpacity = 0.3 + pulse * 0.2;
        }
      }
      
      const color = isCompletedPearl || isActive ? '#fb923c' : '#64748b';
      
      elements.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={currentSize}
          fill={color}
          opacity={currentOpacity}
        />
      );
    }
    
    return elements;
  };

  // Composant Background
  const BackgroundEffects = () => {
    const { circleRadius, circleOpacity } = animationDataRef.current;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, 
              rgba(30, 41, 59, 1) 0%, 
              rgba(15, 23, 42, 1) 100%)`
          }}
        />
        
        {STARS.map((star, idx) => {
          let opacity = star.opacity;
          
          if (star.twinkle && !prefersReducedMotion) {
            const phase = ((starTime / star.twinkleSpeed) * Math.PI * 2) + star.twinkleOffset;
            opacity = star.baseOpacity + Math.sin(phase) * 0.25;
          } else if (star.twinkle) {
            opacity = star.baseOpacity;
          }
          
          return (
            <div
              key={idx}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.layer === 'far' ? '#fcd9b8' : '#fdba74',
                opacity: opacity,
                boxShadow: star.twinkle && !prefersReducedMotion ? `0 0 ${star.size * 2}px rgba(251, 146, 60, ${opacity * 0.5})` : 'none'
              }}
            />
          );
        })}
        
        {(appState === 'breathing' || appState === 'paused') && !prefersReducedMotion && (
          <>
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${circleRadius * 4}px`,
                height: `${circleRadius * 4}px`,
                background: `radial-gradient(circle, 
                  rgba(251, 146, 60, ${circleOpacity * 0.08}) 0%, 
                  rgba(251, 146, 60, 0) 70%)`,
              }}
            />
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${circleRadius * 2.2}px`,
                height: `${circleRadius * 2.2}px`,
                background: `radial-gradient(circle, 
                  rgba(251, 146, 60, ${circleOpacity * 0.15}) 0%, 
                  rgba(251, 146, 60, 0) 80%)`,
              }}
            />
          </>
        )}
      </div>
    );
  };

  // Rendu conditionnel basé sur appState
  if (appState === 'endScreen') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
        <BackgroundEffects />
        <div className="text-center mb-8 relative z-10 animate-fadeIn">
          <h2 className="text-3xl font-light text-orange-400 mb-4">
            Session complete
          </h2>
          <p className="text-orange-300/70 text-lg mb-8">
            Take a moment for yourself...
          </p>
          
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={resetBreathing}
              aria-label="Go back to home screen"
              className={`bg-slate-800/50 text-orange-400/70 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all border border-slate-700/30 flex items-center gap-2 hover:scale-105 hover:bg-slate-800/70 hover:text-orange-400 ${FOCUS_STYLES}`}
            >
              <Home size={20} aria-hidden="true" />
              Back
            </button>
            
            <button
              onClick={startBreathing}
              aria-label="Restart breathing session"
              className={`bg-orange-500/80 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-105 hover:bg-orange-500 ${FOCUS_STYLES}`}
            >
              <RefreshCw size={20} aria-hidden="true" />
              Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'idle') {
    const idleCircle = getIdleCircleProps();
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-y-auto">
        <BackgroundEffects />
        
        <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:px-16 xl:px-24 gap-12 lg:gap-12 relative z-10">
          
          <button 
            className={`w-full lg:flex-1 flex items-center justify-center min-h-[45vh] lg:min-h-0 cursor-pointer bg-transparent border-none ${FOCUS_STYLES}`}
            onClick={startBreathing}
            aria-label="Start breathing session"
          >
            <svg 
              viewBox="0 0 350 350" 
              className="w-[85vw] max-w-[350px] h-auto transition-transform hover:scale-105"
              role="img"
              aria-label="Breathing circle animation"
              style={{ overflow: 'visible' }}
            >
              {!prefersReducedMotion && (
                <circle
                  cx="175"
                  cy="175"
                  r={(25 + idleCircle.radius) * 1.3}
                  fill={`rgba(251, 146, 60, ${idleCircle.opacity * 0.12})`}
                />
              )}
              <circle
                cx="175"
                cy="175"
                r={idleCircle.radius * 1.2}
                fill={`rgba(251, 146, 60, ${idleCircle.opacity * 0.18})`}
              />
              <circle
                cx="175"
                cy="175"
                r="80"
                fill="none"
                stroke="#fdba74"
                strokeWidth="1"
                opacity="0.2"
              />
              <circle
                cx="175"
                cy="175"
                r={25 + idleCircle.radius}
                fill="#fb923c"
                opacity={idleCircle.opacity}
              />
            </svg>
          </button>

          <div className="w-full lg:flex-1 max-w-sm pb-8 lg:pb-0">
            <h1 className="text-2xl font-light text-orange-400 mb-6 text-center lg:text-left">
              Guided Breathing
            </h1>
            
            <div className="space-y-6">
              <fieldset>
                <legend className="block text-sm font-medium text-orange-300/80 mb-3">
                  Breathing pattern
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTechnique('balanced')}
                    aria-pressed={technique === 'balanced'}
                    className={`py-3 px-4 rounded-xl transition-all text-sm ${FOCUS_STYLES} ${
                      technique === 'balanced'
                        ? 'bg-orange-500/80 text-white shadow-lg'
                        : 'bg-slate-800/50 text-orange-300/70 hover:bg-slate-700/60 border border-slate-700/30'
                    }`}
                  >
                    <div className="font-medium">Balanced</div>
                    <div className="text-xs opacity-70 mt-1">4-4-4-4</div>
                  </button>
                  <button
                    onClick={() => setTechnique('longExhale')}
                    aria-pressed={technique === 'longExhale'}
                    className={`py-3 px-4 rounded-xl transition-all text-sm ${FOCUS_STYLES} ${
                      technique === 'longExhale'
                        ? 'bg-orange-500/80 text-white shadow-lg'
                        : 'bg-slate-800/50 text-orange-300/70 hover:bg-slate-700/60 border border-slate-700/30'
                    }`}
                  >
                    <div className="font-medium">Long exhale</div>
                    <div className="text-xs opacity-70 mt-1">4-8</div>
                  </button>
                </div>
              </fieldset>

              <div>
                <label 
                  htmlFor="duration-slider"
                  className="block text-sm font-medium text-orange-300/80 mb-3"
                >
                  Duration: {duration / 60} min
                </label>
                <input
                  id="duration-slider"
                  type="range"
                  min="60"
                  max="300"
                  step="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-valuenow={duration / 60}
                  aria-valuetext={`${duration / 60} minutes`}
                  className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 ${FOCUS_STYLES}`}
                />
                <div className="flex justify-between text-xs text-orange-300 opacity-50 mt-2">
                  <span>1 min</span>
                  <span>5 min</span>
                </div>
              </div>

              <button
                onClick={startBreathing}
                aria-label="Start breathing session"
                className={`w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden ${FOCUS_STYLES}`}
                style={prefersReducedMotion ? {} : {
                  background: `linear-gradient(90deg, 
                    #f97316 0%, 
                    #fb923c ${buttonShimmer}%, 
                    #f97316 100%)`
                }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // États breathing, paused, fadingOut
  const { circleRadius, circleOpacity } = animationDataRef.current;
  const isPaused = appState === 'paused';
  const isFadingOut = appState === 'fadingOut';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <BackgroundEffects />
      
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {getPhaseText()}
      </div>
      
      <div className="text-center mb-8 relative z-10 h-12 flex items-center justify-center">
        <h2 className="text-3xl font-light text-orange-400" aria-hidden="true">
          {getPhaseText()}
        </h2>
      </div>

      <div className="relative z-10">
        <svg 
          width="400" 
          height="400" 
          viewBox="0 0 400 400" 
          className="max-w-full h-auto"
          role="img"
          aria-label={`Breathing circle - ${getPhaseText()}`}
        >
          <circle
            cx="200"
            cy="200"
            r="120"
            fill="none"
            stroke="#fdba74"
            strokeWidth="1"
            opacity="0.15"
          />
          
          <circle
            cx="200"
            cy="200"
            r={circleRadius * 1.4}
            fill={`rgba(251, 146, 60, ${circleOpacity * 0.2})`}
          />
          
          <circle
            cx={200}
            cy={200}
            r={circleRadius}
            fill="#fb923c"
            opacity={circleOpacity}
          />
          
          {renderPearls()}
        </svg>
      </div>

      <div className="flex gap-4 mt-8 relative z-10 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <button
          onClick={pauseBreathing}
          aria-label={isPaused ? "Resume breathing" : "Pause breathing"}
          className={`bg-slate-800/50 text-orange-400/80 p-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700/30 hover:scale-105 hover:bg-slate-800/80 hover:text-orange-400 ${FOCUS_STYLES}`}
        >
          {isPaused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
        </button>
        <button
          onClick={resetBreathing}
          aria-label="Stop and return to home"
          className={`bg-slate-800/50 text-orange-400/80 p-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700/30 hover:scale-105 hover:bg-slate-800/80 hover:text-orange-400 ${FOCUS_STYLES}`}
        >
          <RotateCcw size={20} aria-hidden="true" />
        </button>
      </div>
      
      {isFadingOut && (
        <div 
          className="fixed inset-0 bg-slate-900 pointer-events-none z-50"
          style={{
            animation: prefersReducedMotion ? 'none' : 'fadeIn 10s ease-out forwards',
            opacity: prefersReducedMotion ? 1 : undefined
          }}
          aria-hidden="true"
        />
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </div>
  );
};

export default App;
