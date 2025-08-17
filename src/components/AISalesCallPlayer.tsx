import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, User, Bot, Mic, MicOff } from 'lucide-react';

interface TranscriptSegment {
  speaker: 'AI' | 'User';
  text: string;
  start_time: number;
  end_time: number;
}

interface AISalesCallPlayerProps {
  audioUrl: string;
  transcript?: TranscriptSegment[];
  title?: string;
  description?: string;
}

export const AISalesCallPlayer: React.FC<AISalesCallPlayerProps> = ({
  audioUrl,
  transcript = [],
  title = "Live AI Sales Call Demo",
  description = "Listen to how our AI agent handles real sales conversations"
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'AI' | 'User' | null>(null);
  const [currentSegment, setCurrentSegment] = useState<TranscriptSegment | null>(null);

  // Update current time and find active speaker
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      
      // Find current speaking segment
      if (transcript.length > 0) {
        const activeSegment = transcript.find(
          segment => audio.currentTime >= segment.start_time && audio.currentTime <= segment.end_time
        );
        
        if (activeSegment) {
          setCurrentSpeaker(activeSegment.speaker);
          setCurrentSegment(activeSegment);
        } else {
          setCurrentSpeaker(null);
          setCurrentSegment(null);
        }
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [transcript]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value) / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            {title}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 sm:p-12">
          {/* Audio Element */}
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          {/* Speaker Indicators */}
          <div className="flex items-center justify-center space-x-8 mb-8">
            <div className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-300 ${
              currentSpeaker === 'AI' 
                ? 'bg-yellow-400/20 border-2 border-yellow-400/50 shadow-lg shadow-yellow-400/25' 
                : 'bg-gray-800/50 border border-gray-600/50'
            }`}>
              <div className={`relative ${currentSpeaker === 'AI' ? 'animate-pulse' : ''}`}>
                <Bot className={`h-8 w-8 ${currentSpeaker === 'AI' ? 'text-yellow-400' : 'text-gray-400'}`} />
                {currentSpeaker === 'AI' && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                    <div className="absolute top-0 w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                )}
              </div>
              <div>
                <p className={`font-semibold ${currentSpeaker === 'AI' ? 'text-yellow-400' : 'text-gray-400'}`}>
                  AI Agent
                </p>
                <p className="text-xs text-gray-500">Sales Assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSpeaker === 'AI' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
              }`}></div>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentSpeaker === 'User' ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
              }`}></div>
            </div>

            <div className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-300 ${
              currentSpeaker === 'User' 
                ? 'bg-blue-400/20 border-2 border-blue-400/50 shadow-lg shadow-blue-400/25' 
                : 'bg-gray-800/50 border border-gray-600/50'
            }`}>
              <div className={`relative ${currentSpeaker === 'User' ? 'animate-pulse' : ''}`}>
                <User className={`h-8 w-8 ${currentSpeaker === 'User' ? 'text-blue-400' : 'text-gray-400'}`} />
                {currentSpeaker === 'User' && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                    <div className="absolute top-0 w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                )}
              </div>
              <div>
                <p className={`font-semibold ${currentSpeaker === 'User' ? 'text-blue-400' : 'text-gray-400'}`}>
                  Prospect
                </p>
                <p className="text-xs text-gray-500">Potential Customer</p>
              </div>
            </div>
          </div>

          {/* Current Transcript Display */}
          {currentSegment && (
            <div className="mb-8 p-6 bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  currentSegment.speaker === 'AI' ? 'bg-yellow-400/20' : 'bg-blue-400/20'
                }`}>
                  {currentSegment.speaker === 'AI' ? (
                    <Bot className={`h-5 w-5 ${currentSegment.speaker === 'AI' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  ) : (
                    <User className={`h-5 w-5 ${currentSegment.speaker === 'AI' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm mb-1 ${
                    currentSegment.speaker === 'AI' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {currentSegment.speaker === 'AI' ? 'AI Agent' : 'Prospect'}
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    "{currentSegment.text}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audio Controls */}
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #facc15 0%, #facc15 ${progress}%, #374151 ${progress}%, #374151 100%)`
                  }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-6">
              <button
                onClick={restart}
                className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-colors"
                title="Restart"
              >
                <RotateCcw className="h-5 w-5 text-gray-300" />
              </button>

              <button
                onClick={togglePlay}
                className="p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-yellow-400/25"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-black" />
                ) : (
                  <Play className="h-6 w-6 text-black ml-1" />
                )}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-full transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5 text-gray-300" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-gray-300" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume * 100}
                  onChange={handleVolumeChange}
                  className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #facc15 0%, #facc15 ${isMuted ? 0 : volume * 100}%, #374151 ${isMuted ? 0 : volume * 100}%, #374151 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Call Stats */}
          <div className="mt-8 pt-8 border-t border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-gray-900/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {transcript.filter(s => s.speaker === 'AI').length}
                </div>
                <div className="text-sm text-gray-400">AI Responses</div>
              </div>
              <div className="bg-gray-900/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {transcript.filter(s => s.speaker === 'User').length}
                </div>
                <div className="text-sm text-gray-400">User Interactions</div>
              </div>
              <div className="bg-gray-900/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {formatTime(duration)}
                </div>
                <div className="text-sm text-gray-400">Total Duration</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #facc15;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(250, 204, 21, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(250, 204, 21, 0.4);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #facc15;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 8px rgba(250, 204, 21, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(250, 204, 21, 0.4);
        }
      `}</style>
    </section>
  );
};