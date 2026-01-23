import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Home, RefreshCw } from 'lucide-react';

const App = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [technique, setTechnique] = useState('balanced');
  const [duration, setDuration] = useState(60);
  const [phase, setPhase] = useState('idle');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [circleRadius, setCircleRadius] = useState(30);
  const [circleOpacity, setCircleOpacity] = useState(0.15);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  
  // Accessibilité : détecter si l'utilisateur préfère moins de mouvements
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const totalPausedRef = useRef(0);
  const fadeTimeoutRef = useRef(null);
  const lastCycleRef = useRef(-1);

  const getTimings = useCallback(() => {
    if (technique === 'balanced') {
      return { inhale: 4000, hold1: 4000, exhale: 4000, hold2: 4000 };
    } else {
      return { inhale: 4000, hold1: 500, exhale: 8000, hold2: 500 };
    }
  }, [technique]);

  const timings = getTimings();
  const cycleTime = timings.inhale + timings.hold1 + timings.exhale + timings.hold2;

  const phasesPerCycle = 4;

  useEffect(() => {
    setTotalCycles(Math.ceil((duration * 1000) / cycleTime));
  }, [duration, cycleTime]);

  const playChime = () => {
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
  };

  const startBreathing = () => {
    setIsStarted(true);
    setIsPaused(false);
    setIsCompleted(false);
    setIsFadingOut(false);
    setShowEndScreen(false);
    setCycleCount(0);
    setElapsedTime(0);
    setPhaseIndex(0);
    lastCycleRef.current = -1;
    startTimeRef.current = performance.now();
    pausedAtRef.current = null;
    totalPausedRef.current = 0;
    setPhase('inhale');
    setCircleRadius(30);
    setCircleOpacity(0.15);
  };

  const restartBreathing = () => {
    startBreathing();
  };

  const pauseBreathing = () => {
    if (!isPaused) {
      pausedAtRef.current = performance.now();
    } else {
      if (pausedAtRef.current) {
        totalPausedRef.current += performance.now() - pausedAtRef.current;
      }
      pausedAtRef.current = null;
    }
    setIsPaused(!isPaused);
  };

  const resetBreathing = () => {
    setIsStarted(false);
    setIsPaused(false);
    setIsCompleted(false);
    setIsFadingOut(false);
    setShowEndScreen(false);
    setPhase('idle');
    setPhaseIndex(0);
    setCircleRadius(30);
    setCircleOpacity(0.15);
    setCycleCount(0);
    setElapsedTime(0);
    lastCycleRef.current = -1;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
  };

  // Animation principale
  useEffect(() => {
    if (!isStarted || isPaused || isCompleted) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (now) => {
      const totalElapsed = now - startTimeRef.current - totalPausedRef.current;
      
      setElapsedTime(totalElapsed);

      if (totalElapsed >= duration * 1000) {
        playChime();
        setIsCompleted(true);
        setIsFadingOut(true);
        
        fadeTimeoutRef.current = setTimeout(() => {
          setShowEndScreen(true);
        }, 10000);
        return;
      }

      const cyclePosition = totalElapsed % cycleTime;
      
      const easeInOut = (t) => {
        return t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
      };

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

      const currentCycleNumber = Math.floor(totalElapsed / cycleTime);
      if (currentCycleNumber > lastCycleRef.current) {
        lastCycleRef.current = currentCycleNumber;
        setCycleCount(currentCycleNumber + 1);
      }

      setPhase(currentPhase);
      setPhaseIndex(currentPhaseIndex);
      setPhaseProgress(linearProgress);

      const minRadius = 30;
      const maxRadius = 120;
      const minArea = minRadius * minRadius;
      const maxArea = maxRadius * maxRadius;
      const currentArea = minArea + sizeProgress * (maxArea - minArea);
      const radius = Math.sqrt(currentArea);

      const baseOpacity = 0.25 + sizeProgress * 0.35;
      
      let opacity = baseOpacity;
      if (currentPhase === 'hold1' || currentPhase === 'hold2') {
        const pulsePhase = (linearProgress * Math.PI * 2);
        opacity += Math.sin(pulsePhase) * 0.08;
      }

      setCircleRadius(radius);
      setCircleOpacity(Math.max(0.2, Math.min(0.65, opacity)));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isStarted, isPaused, isCompleted, duration, timings, cycleTime]);

  // Animation idle (désactivée si prefers-reduced-motion)
  const [idlePulse, setIdlePulse] = useState(0);
  useEffect(() => {
    if (phase === 'idle' && !isCompleted && !isStarted && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setIdlePulse(p => (p + 0.012) % (Math.PI * 2)); // Plus lent et fluide
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, isCompleted, isStarted, prefersReducedMotion]);

  const [buttonShimmer, setButtonShimmer] = useState(0);
  useEffect(() => {
    if (!isStarted && !isCompleted && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setButtonShimmer(s => (s + 1) % 100);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isStarted, isCompleted, prefersReducedMotion]);

  const getPhaseText = () => {
    if (phase === 'idle') return isCompleted ? '' : 'Ready';
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    if (phase === 'hold1' || phase === 'hold2') {
      if (technique === 'longExhale') return '';
      return 'Hold';
    }
    return '';
  };

  const getIdleCircleProps = () => {
    if (isCompleted) {
      return { radius: 30, opacity: 0 };
    }
    // Si prefers-reduced-motion, pas de pulsation
    if (prefersReducedMotion) {
      return { radius: 55, opacity: 0.75 };
    }
    // Animation plus fluide avec courbe sinusoïdale douce
    const pulse = 0.5 + Math.sin(idlePulse) * 0.12;
    return {
      radius: 30 + pulse * 50,
      opacity: 0.65 + Math.sin(idlePulse) * 0.1
    };
  };

  // Rendu des perles
  const renderPearls = () => {
    const elements = [];
    const radius = 160;
    const totalPearls = totalCycles * phasesPerCycle;
    
    const currentCycle = Math.floor(elapsedTime / cycleTime);
    const activePearlIndex = currentCycle * phasesPerCycle + phaseIndex;
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
      
      let baseSize;
      if (isMainPhase) {
        baseSize = 8;
      } else {
        baseSize = isLongExhale ? 1 : 5;
      }
      
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
          key={`pearl-${i}`}
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

  // Génération des étoiles
  const [stars] = useState(() => {
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
  });

  // Animation des étoiles (désactivée si prefers-reduced-motion)
  const [starTime, setStarTime] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const interval = setInterval(() => {
      setStarTime(t => t + 50);
    }, 50);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Background avec ciel étoilé et halo
  const BackgroundEffects = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, 
            rgba(30, 41, 59, 1) 0%, 
            rgba(15, 23, 42, 1) 100%)`
        }}
      />
      
      {/* Étoiles (fixes si prefers-reduced-motion) */}
      {stars.map((star, idx) => {
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
      
      {/* Halos (désactivés si prefers-reduced-motion) */}
      {isStarted && !showEndScreen && !prefersReducedMotion && (
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
      
      {!isStarted && !showEndScreen && !prefersReducedMotion && (
        <></>
      )}
    </div>
  );

  // Styles pour le focus visible
  const focusStyles = "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  if (showEndScreen) {
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
              className={`bg-slate-800/50 text-orange-400/70 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all border border-slate-700/30 flex items-center gap-2 hover:scale-105 hover:bg-slate-800/70 hover:text-orange-400 ${focusStyles}`}
            >
              <Home size={20} aria-hidden="true" />
              Back
            </button>
            
            <button
              onClick={restartBreathing}
              aria-label="Restart breathing session"
              className={`bg-orange-500/80 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-105 hover:bg-orange-500 ${focusStyles}`}
            >
              <RefreshCw size={20} aria-hidden="true" />
              Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    const idleCircle = getIdleCircleProps();
    return (
      <div className="min-h-screen bg-slate-900 relative overflow-y-auto">
        <BackgroundEffects />
        
        <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:px-16 xl:px-24 gap-12 lg:gap-12 relative z-10">
          
          {/* Cercle cliquable - accessible au clavier */}
          <button 
            className={`w-full lg:flex-1 flex items-center justify-center min-h-[45vh] lg:min-h-0 cursor-pointer bg-transparent border-none ${focusStyles}`}
            onClick={startBreathing}
            aria-label="Start breathing session"
          >
            <svg 
              width="280" 
              height="280" 
              viewBox="0 0 280 280" 
              className="transition-transform hover:scale-105"
              role="img"
              aria-label="Breathing circle animation"
            >
              {/* Halo externe - suit le cercle */}
              {!prefersReducedMotion && (
                <circle
                  cx="140"
                  cy="140"
                  r={(25 + idleCircle.radius) * 1.8}
                  fill={`rgba(251, 146, 60, ${idleCircle.opacity * 0.15})`}
                />
              )}
              {/* Halo moyen */}
              <circle
                cx="140"
                cy="140"
                r={idleCircle.radius * 1.5}
                fill={`rgba(251, 146, 60, ${idleCircle.opacity * 0.2})`}
              />
              {/* Cercle guide */}
              <circle
                cx="140"
                cy="140"
                r="80"
                fill="none"
                stroke="#fdba74"
                strokeWidth="1"
                opacity="0.2"
              />
              {/* Cercle principal */}
              <circle
                cx="140"
                cy="140"
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
                    className={`py-3 px-4 rounded-xl transition-all text-sm ${focusStyles} ${
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
                    className={`py-3 px-4 rounded-xl transition-all text-sm ${focusStyles} ${
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
                  className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 ${focusStyles}`}
                />
                <div className="flex justify-between text-xs text-orange-300 opacity-50 mt-2">
                  <span>1 min</span>
                  <span>5 min</span>
                </div>
              </div>

              <button
                onClick={startBreathing}
                aria-label="Start breathing session"
                className={`w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-medium text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden ${focusStyles}`}
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <BackgroundEffects />
      
      {/* Annonce vocale pour les lecteurs d'écran */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {getPhaseText()}
      </div>
      
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-3xl font-light text-orange-400 mb-2" aria-hidden="true">
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
          className={`bg-slate-800/50 text-orange-400/80 p-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700/30 hover:scale-105 hover:bg-slate-800/80 hover:text-orange-400 ${focusStyles}`}
        >
          {isPaused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
        </button>
        <button
          onClick={resetBreathing}
          aria-label="Stop and return to home"
          className={`bg-slate-800/50 text-orange-400/80 p-3 rounded-full shadow-lg hover:shadow-xl transition-all border border-slate-700/30 hover:scale-105 hover:bg-slate-800/80 hover:text-orange-400 ${focusStyles}`}
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
