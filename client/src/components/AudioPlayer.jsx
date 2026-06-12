import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Gauge } from 'lucide-react';

const AudioPlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    // Reset player states when src changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [src]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log('Audio playback error:', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newPercentage = clickX / width;
    const newTime = newPercentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skip = (amount) => {
    if (audioRef.current) {
      let newTime = audioRef.current.currentTime + amount;
      if (newTime < 0) newTime = 0;
      if (newTime > duration) newTime = duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const changeSpeed = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (audioRef.current) {
      audioRef.current.muted = nextMute;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      audioRef.current.muted = newVolume === 0;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="audio-player-card">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => skip(-10)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem' }} title="Rewind 10s">
            <RotateCcw size={16} />
          </button>
          
          <button onClick={togglePlay} className="btn btn-primary" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>
          
          <button onClick={() => skip(10)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem' }} title="Forward 10s">
            <RotateCw size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(currentTime)}</span>
          <div className="audio-progress-bar" onClick={handleSeek}>
            <div 
              className="audio-progress-filled" 
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(duration)}</span>
        </div>

        {/* Volume controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={toggleMute} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem', border: 'none', background: 'none' }}>
            {isMuted ? <VolumeX size={16} color="var(--accent-crimson)" /> : <Volume2 size={16} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={isMuted ? 0 : volume} 
            onChange={handleVolumeChange} 
            style={{ width: '60px', accentColor: 'var(--primary)' }}
          />
        </div>

        {/* Playback speed options */}
        <div className="audio-speed-control">
          <Gauge size={14} />
          {speedOptions.map((rate) => (
            <button
              key={rate}
              onClick={() => changeSpeed(rate)}
              className={`audio-speed-btn ${playbackRate === rate ? 'active' : ''}`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
