'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getData } from '@/lib/indexeddb';

// Smooth Typewriter Component
function TypewriterText({ text, delay = 0, speed = 50 }: { text: string; delay?: number; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayedText('');
    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;

      if (elapsed > delay) {
        const charIndex = Math.floor((elapsed - delay) / speed);
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayedText(text);
        }
      } else {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [text, delay, speed]);

  return <span>{displayedText}</span>;
}

export default function ExperiencePage() {
  const [phase, setPhase] = useState<'locked' | 'blackfade' | 'greeting' | 'memories' | 'surprise' | 'letter' | 'dashboard'>('locked');
  const [currentMemoryIndex, setCurrentMemoryIndex] = useState(0);
  const [memories, setMemories] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showExpandedMessage, setShowExpandedMessage] = useState(false);
  const [audioFiles, setAudioFiles] = useState<any>({});
  const [finalLetter, setFinalLetter] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // ===== DATE CHECK FUNCTIONS =====
  // Get time until midnight IST
  const getTimeUntilMidnight = (): string => {
    try {
      const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const midnight = new Date(istDate);
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - istDate.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (e) {
      return '00h 00m';
    }
  };

  // Check if we should allow access (birthday today or past)
  const canAccessExperience = (birthdayDateStr: string): { canAccess: boolean; timeRemaining: string } => {
    try {
      const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const birthdayDate = new Date(birthdayDateStr);
      
      // Set birthday to start of day for comparison
      birthdayDate.setHours(0, 0, 0, 0);
      
      // Get today's date at start of day
      const todayStart = new Date(istDate);
      todayStart.setHours(0, 0, 0, 0);
      
      // If birthday is in the future
      if (todayStart < birthdayDate) {
        return { canAccess: false, timeRemaining: getTimeUntilMidnight() };
      }
      
      // If birthday is today
      if (todayStart.getTime() === birthdayDate.getTime()) {
        // Check if it's past midnight (00:00)
        if (istDate.getHours() === 0 && istDate.getMinutes() < 1) {
          // Just past midnight
          return { canAccess: true, timeRemaining: '' };
        }
        // After midnight, allow access
        if (istDate.getHours() > 0) {
          return { canAccess: true, timeRemaining: '' };
        }
        // Before midnight, show wait message
        return { canAccess: false, timeRemaining: getTimeUntilMidnight() };
      }
      
      // If birthday is in the past, allow access
      if (todayStart > birthdayDate) {
        return { canAccess: true, timeRemaining: '' };
      }
      
      return { canAccess: false, timeRemaining: getTimeUntilMidnight() };
    } catch (e) {
      console.error('Date check error:', e);
      return { canAccess: true, timeRemaining: '' };
    }
  };

  // ===== MAIN EFFECT - LOAD DATA FROM INDEXEDDB =====
  useEffect(() => {
    const sessionKey = localStorage.getItem('sessionKey');
    if (!sessionKey) {
      router.push('/');
      return;
    }

    setIsAuthorized(true);

    const loadData = async () => {
  // Check if key came from URL
  const params = new URLSearchParams(window.location.search);
  const keyFromUrl = params.get('key');
  
  if (keyFromUrl) {
    localStorage.setItem('sessionKey', keyFromUrl);
    localStorage.setItem('sessionTime', Date.now().toString());
  }

  try {
        const storedData = await getData();
        
        let loadedMemories: any[] = [];
        let audio: any = {};
        let letter = '';
        let birthdayDate = '';
        
        if (storedData) {
          birthdayDate = storedData.birthdayDate;
          
          // Check if we can access the experience
          const { canAccess, timeRemaining: remaining } = canAccessExperience(birthdayDate);
          
          if (!canAccess) {
            setPhase('locked');
            setTimeRemaining(remaining);
            
            // Update time every minute
            const timer = setInterval(() => {
              const { timeRemaining: updatedTime } = canAccessExperience(birthdayDate);
              setTimeRemaining(updatedTime);
            }, 60000);
            return () => clearInterval(timer);
          }

          loadedMemories = storedData.memories || [];
          audio = storedData.audio || {};
          letter = storedData.finalLetter || '';
        }

        setMemories(loadedMemories);
        setAudioFiles(audio);
        setFinalLetter(letter);

        const timers = [
          setTimeout(() => setPhase('blackfade'), 500),
          setTimeout(() => setPhase('greeting'), 2500),
          setTimeout(() => setPhase('memories'), 4500),
        ];

        return () => timers.forEach(t => clearTimeout(t));
      } catch (e) {
        console.error('Failed to load data:', e);
        // Fallback to empty state
        setPhase('blackfade');
      }
    };

    loadData();
  }, [router]);

// Background music - plays from greeting through letter phases
useEffect(() => {
  const musicPhases = ['greeting', 'memories', 'surprise', 'letter'];
  
  if (musicPhases.includes(phase) && audioFiles.backgroundMusic) {
    try {
      // Create new audio only if needed
      if (!bgAudioRef.current || bgAudioRef.current.paused) {
        // Clean up old audio
        if (bgAudioRef.current) {
          bgAudioRef.current.pause();
        }
        
        // Create and play new audio
        const audio = new Audio();
        audio.src = audioFiles.backgroundMusic;
        audio.loop = true;
        audio.volume = 0.4;
        audio.play().catch(e => console.error('Background music error:', e));
        
        bgAudioRef.current = audio;
      }
    } catch (e) {
      console.error('Audio setup error:', e);
    }
  } else if (phase === 'dashboard') {
    // Stop music when reaching dashboard
    if (bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current.currentTime = 0;
      bgAudioRef.current = null;
    }
  }
}, [phase, audioFiles.backgroundMusic]);

  const handleMemoryClick = () => {
    if (currentMemoryIndex < memories.length - 1) {
      setCurrentMemoryIndex(currentMemoryIndex + 1);
      setShowExpandedMessage(false);
      setShowVideoPlayer(false);
    } else {
      setPhase('surprise');
    }
  };

  if (!isAuthorized) {
    return null;
  }

  // Phase 0: Locked (Before Birthday)
  if (phase === 'locked') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .pulse-animate {
            animation: pulse 2s ease-in-out infinite;
          }
        `}</style>
        <div className="max-w-2xl w-full text-center">
          <div className="backdrop-blur-md bg-white/90 rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
            <div className="text-5xl md:text-6xl mb-6 pulse-animate">⏳</div>
            <h1 className="text-3xl md:text-4xl font-light text-purple-900 mb-4">
              Please wait, Sweetheart 💕
            </h1>
            <p className="text-base md:text-lg text-gray-700 font-light mb-8">
              Your special surprise is waiting for you at midnight (IST)
            </p>
            <div className="text-2xl md:text-3xl font-light text-pink-500 mb-8">
              {timeRemaining}
            </div>
            <p className="text-xs md:text-sm text-gray-600 font-light">
              The countdown will start automatically
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Black Fade
  if (phase === 'blackfade') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <style jsx>{`
          @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
          .fade-out {
            animation: fadeOut 2s ease-in-out forwards;
          }
        `}</style>
        <div className="fade-out">
          <div className="text-center">
            <div className="text-5xl md:text-6xl mb-4">💗</div>
            <p className="text-white font-light text-base md:text-lg">Loading your magic...</p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Greeting
  if (phase === 'greeting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <style jsx>{`
          @keyframes slideUp {
            0% { 
              opacity: 0;
              transform: translateY(50px);
            }
            100% { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .slide-up {
            animation: slideUp 1.5s ease-out forwards;
          }
          .heartbeat {
            animation: heartbeat 1.5s ease-in-out infinite;
          }
        `}</style>

        <div className="text-center">
          <div className="heartbeat mb-8">
            <span className="text-6xl md:text-7xl">❤️</span>
          </div>
          <div className="slide-up">
            <h1 className="text-4xl md:text-6xl font-light text-white mb-4">
              Happy Birthday
            </h1>
            <p className="text-lg md:text-xl text-pink-200 font-light">
              Let me take you on a journey through our memories...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 3: Memories
  if (phase === 'memories') {
    const currentMemory = memories[currentMemoryIndex];

    if (!currentMemory || memories.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
          <p className="text-gray-600 font-light text-lg">Loading your memories...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <style jsx>{`
          @keyframes slideUpIn {
            0% {
              opacity: 0;
              transform: translateY(60px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInLeft {
            0% {
              opacity: 0;
              transform: translateX(-100px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideInRight {
            0% {
              opacity: 0;
              transform: translateX(100px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes fadeInText {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
            }
            50% { 
              box-shadow: 0 0 40px rgba(236, 72, 153, 0.6);
            }
          }
          .slide-up-in {
            animation: slideUpIn 1s ease-out forwards;
          }
          .slide-in-left {
            animation: slideInLeft 1s ease-out forwards;
          }
          .slide-in-right {
            animation: slideInRight 1s ease-out forwards;
          }
          .fade-in-text {
            animation: fadeInText 0.8s ease-out forwards;
            animation-delay: 0.3s;
            opacity: 0;
          }
          .glow {
            animation: glow 2s ease-in-out infinite;
          }
        `}</style>

        <div className="max-w-5xl w-full">
          <div className="slide-up-in">
            <div className="backdrop-blur-md bg-white/40 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 glow overflow-hidden">
              <div className="text-center mb-6">
                <span className="inline-block px-6 py-2 bg-gradient-to-r from-pink-300 to-purple-300 text-white rounded-full text-xs md:text-sm font-light">
                  Memory #{currentMemory.number} of {memories.length}
                </span>
              </div>

              {/* Dynamic layout */}
              {currentMemoryIndex % 2 === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                  {(currentMemory.photoUrl || currentMemory.videoUrl) && (
                    <div className="slide-in-left rounded-xl md:rounded-2xl overflow-hidden shadow-lg h-64 w-full relative">
                      {showVideoPlayer && currentMemory.videoUrl ? (
                        <video
                          src={currentMemory.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          style={{ backgroundColor: '#000' }}
                          onError={(e) => console.error('Video error:', e)}
                        />
                      ) : currentMemory.photoUrl ? (
                        <>
                          <img
                            src={currentMemory.photoUrl}
                            alt={`Memory ${currentMemory.number}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => console.error('Image error:', e)}
                          />
                          {currentMemory.videoUrl && (
                            <button
                              onClick={() => setShowVideoPlayer(true)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all w-full h-full"
                            >
                              <span className="text-white text-4xl">▶</span>
                            </button>
                          )}
                        </>
                      ) : currentMemory.videoUrl ? (
                        <>
                          <video
                            src={currentMemory.videoUrl}
                            className="w-full h-full object-cover"
                            style={{ backgroundColor: '#000' }}
                          />
                          <button
                            onClick={() => setShowVideoPlayer(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all w-full h-full"
                          >
                            <span className="text-white text-4xl">▶</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                  <div className={(currentMemory.photoUrl || currentMemory.videoUrl) ? '' : 'col-span-1 md:col-span-2'}>
                    <div className="fade-in-text">
                      <p className="text-2xl md:text-3xl font-light text-gray-800 leading-relaxed">
                        <TypewriterText text={currentMemory.message} delay={300} speed={40} />
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                  <div className={(currentMemory.photoUrl || currentMemory.videoUrl) ? '' : 'col-span-1 md:col-span-2'}>
                    <div className="fade-in-text">
                      <p className="text-2xl md:text-3xl font-light text-gray-800 leading-relaxed">
                        <TypewriterText text={currentMemory.message} delay={300} speed={40} />
                      </p>
                    </div>
                  </div>
                  {(currentMemory.photoUrl || currentMemory.videoUrl) && (
                    <div className="slide-in-right rounded-xl md:rounded-2xl overflow-hidden shadow-lg h-64 w-full relative">
                      {showVideoPlayer && currentMemory.videoUrl ? (
                        <video
                          src={currentMemory.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          style={{ backgroundColor: '#000' }}
                          onError={(e) => console.error('Video error:', e)}
                        />
                      ) : currentMemory.photoUrl ? (
                        <>
                          <img
                            src={currentMemory.photoUrl}
                            alt={`Memory ${currentMemory.number}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => console.error('Image error:', e)}
                          />
                          {currentMemory.videoUrl && (
                            <button
                              onClick={() => setShowVideoPlayer(true)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all w-full h-full"
                            >
                              <span className="text-white text-4xl">▶</span>
                            </button>
                          )}
                        </>
                      ) : currentMemory.videoUrl ? (
                        <>
                          <video
                            src={currentMemory.videoUrl}
                            className="w-full h-full object-cover"
                            style={{ backgroundColor: '#000' }}
                          />
                          <button
                            onClick={() => setShowVideoPlayer(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all w-full h-full"
                          >
                            <span className="text-white text-4xl">▶</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Expandable message */}
              {!showExpandedMessage && currentMemory.expandedMessage && (
                <div className="text-center mt-6 md:mt-8">
                  <button
                    onClick={() => setShowExpandedMessage(true)}
                    className="text-pink-500 hover:text-pink-700 text-xs md:text-sm font-light underline transition active:scale-95"
                  >
                    Click to read more... 💭
                  </button>
                </div>
              )}

              {showExpandedMessage && currentMemory.expandedMessage && (
                <div className="mt-6 md:mt-8 p-4 bg-pink-100/30 rounded-lg border border-pink-200 animate-in fade-in duration-500">
                  <p className="text-base md:text-lg font-light text-gray-700 leading-relaxed italic">
                    "{currentMemory.expandedMessage}"
                  </p>
                </div>
              )}

              {/* Action button */}
              <div className="text-center mt-6 md:mt-8">
                <button
                  onClick={handleMemoryClick}
                  className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full hover:shadow-xl transition-all font-light text-sm md:text-lg hover:scale-105 transform active:scale-95"
                >
                  {currentMemoryIndex < memories.length - 1
                    ? 'Next Memory ✨'
                    : 'Open Surprise 🎁'}
                </button>
              </div>

              {/* Progress indicator */}
              <div className="mt-6 md:mt-8 flex justify-center gap-2 flex-wrap">
                {memories.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx <= currentMemoryIndex
                        ? 'bg-pink-400 w-6'
                        : 'bg-gray-300 w-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase 4: Surprise
  if (phase === 'surprise') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <style jsx>{`
          @keyframes boxOpen {
            0% {
              transform: scale(0) rotateY(0deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotateY(180deg);
            }
            100% {
              transform: scale(1) rotateY(360deg);
              opacity: 1;
            }
          }
          @keyframes confetti {
            0% {
              opacity: 1;
              transform: translateY(0) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translateY(100px) rotate(360deg);
            }
          }
          .box-open {
            animation: boxOpen 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
          }
          .confetti {
            position: fixed;
            pointer-events: none;
          }
        `}</style>

        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              animation: `confetti ${1 + Math.random() * 1}s ease-in forwards`,
              animationDelay: `${Math.random() * 0.5}s`,
              fontSize: '20px'
            }}
          >
            {'💝✨🎉💗🌸'[Math.floor(Math.random() * 5)]}
          </div>
        ))}

        <div className="text-center max-w-2xl w-full">
          <div className="box-open mb-8 md:mb-12 text-7xl md:text-9xl">
            🎁
          </div>

          <div className="backdrop-blur-md bg-white/40 rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
            <h2 className="text-3xl md:text-4xl font-light text-purple-900 mb-6">
              You've Unlocked Everything! 💝
            </h2>

            <p className="text-base md:text-lg text-gray-700 font-light mb-8 leading-relaxed">
              But before we show you the whole universe, there's one final message for you...
            </p>

            <button
              onClick={() => setPhase('letter')}
              className="w-full py-3 md:py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full hover:shadow-xl transition-all font-light text-sm md:text-lg active:scale-95"
            >
              Open Final Letter 💌
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 5: Final Letter
  if (phase === 'letter') {
    const defaultLetter = `My dearest,

As you've journeyed through these memories, I hope each one reminded you of the special moments we share. Every photograph, every word, every emotion captured here is a reflection of my feelings for you.

But this is just the beginning. This private universe we've created together is a space where we can grow, dream, and cherish each other. In the pages that follow, you'll discover tools to track our journey together, write our story, and hold onto the dreams we share.

Thank you for being you. Thank you for making every day brighter.

Happy Birthday to the most wonderful person in my life. 🎂✨

Forever yours,
💕`;

    const displayLetter = finalLetter || defaultLetter;

    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <style jsx>{`
          @keyframes letterAppear {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          .letter-appear {
            animation: letterAppear 1s ease-out forwards;
          }
        `}</style>

        <div className="max-w-2xl w-full letter-appear">
          <div className="backdrop-blur-md bg-white/90 rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <span className="text-4xl md:text-5xl">💌</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-light text-purple-900 mb-4">
                Forever Yours
              </h2>
            </div>

            <div className="space-y-6 text-gray-800 font-light leading-relaxed mb-8 max-h-96 overflow-y-auto pr-2">
              {displayLetter.split('\n').map((paragraph, idx) => (
                <p key={idx} className="text-sm md:text-base">{paragraph}</p>
              ))}
            </div>

            <button
              onClick={() => setPhase('dashboard')}
              className="w-full py-3 md:py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full hover:shadow-xl transition-all font-light text-sm md:text-lg active:scale-95"
            >
              Explore Your Universe 🌟
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 6: Dashboard Preview
  if (phase === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-blue-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-light text-purple-900 mb-2">
              🌟 Your Private Universe
            </h1>
            <p className="text-pink-600 font-light text-sm md:text-base">
              Coming Soon - Phase 2 Features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            {[
              { emoji: '📖', title: 'Digital Diary', desc: 'Document your feelings and dreams' },
              { emoji: '🎙️', title: 'Audio Memories', desc: 'Record your voice and moments' },
              { emoji: '🎯', title: 'Goal Tracker', desc: 'Track our dreams together' },
              { emoji: '💧', title: 'Wellness Hub', desc: 'Health and wellness tracking' },
              { emoji: '🌍', title: 'Dream Places', desc: 'Plan adventures together' },
              { emoji: '💰', title: 'Money Tracker', desc: 'Manage finances transparently' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="backdrop-blur-md bg-white/40 rounded-xl md:rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <div className="text-2xl md:text-3xl mb-4">{feature.emoji}</div>
                <h2 className="text-lg md:text-2xl font-light text-purple-900 mb-2">{feature.title}</h2>
                <p className="text-gray-700 font-light text-xs md:text-base">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                localStorage.removeItem('sessionKey');
                localStorage.removeItem('sessionTime');
                router.push('/');
              }}
              className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full hover:shadow-xl transition-all font-light text-sm md:text-lg active:scale-95"
            >
              Return Home 🏠
            </button>
          </div>

          <div className="text-center mt-12 text-gray-600 font-light text-sm md:text-base">
            <p>✨ Phase 2 features coming soon</p>
            <p className="text-xs md:text-sm mt-2">Thank you for using Birthday Vault 💝</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}