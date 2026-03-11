"use client";

import { useState, useEffect, useRef } from 'react';

interface UseAudioAnalysisProps {
  microphoneStream?: MediaStream | null;
  enableMicAnalysis?: boolean;
  enableSpeakerAnalysis?: boolean;
  smoothingFactor?: number; // 0-1, higher = more smoothing
}

export function useAudioAnalysis({
  microphoneStream,
  enableMicAnalysis = false,
  enableSpeakerAnalysis = false,
  smoothingFactor = 0.3
}: UseAudioAnalysisProps) {
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  
  const micAnalyzerRef = useRef<{
    audioContext: AudioContext;
    analyser: AnalyserNode;
    dataArray: Uint8Array;
    animationId: number | null;
  } | null>(null);
  
  const speakerAnalyzerRef = useRef<{
    audioContext: AudioContext;
    analyser: AnalyserNode;
    dataArray: Uint8Array;
    animationId: number | null;
  } | null>(null);

  // Track interval for audio element scanning to prevent memory leak
  const checkIntervalRef = useRef<number | null>(null);

  // Microphone analysis
  useEffect(() => {
    if (!enableMicAnalysis || !microphoneStream) {
      // Clean up existing analyzer
      if (micAnalyzerRef.current) {
        if (micAnalyzerRef.current.animationId) {
          cancelAnimationFrame(micAnalyzerRef.current.animationId);
        }
        micAnalyzerRef.current.audioContext.close();
        micAnalyzerRef.current = null;
      }
      setMicLevel(0);
      return;
    }

    const setupMicAnalysis = async () => {
      try {
        console.log('🎤 Setting up microphone audio analysis...');
        
        const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        
        // Configure analyzer for real-time audio level detection
        analyser.fftSize = 256; // Small size for better performance
        analyser.smoothingTimeConstant = 0.8;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        // Connect microphone stream to analyzer
        const source = audioContext.createMediaStreamSource(microphoneStream);
        source.connect(analyser);
        
        micAnalyzerRef.current = {
          audioContext,
          analyser,
          dataArray,
          animationId: null
        };
        
        // Start analysis loop
        const analyze = () => {
          if (!micAnalyzerRef.current) return;
          
          const { analyser, dataArray } = micAnalyzerRef.current;
          
          // Get frequency data
          analyser.getByteFrequencyData(dataArray as Uint8Array);
          
          // Calculate average amplitude
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          // Normalize to 0-1 range and apply smoothing
          const normalizedLevel = Math.min(average / 128, 1);
          
          setMicLevel(prev => {
            const smoothed = (1 - smoothingFactor) * normalizedLevel + smoothingFactor * prev;
            return smoothed;
          });
          
          micAnalyzerRef.current.animationId = requestAnimationFrame(analyze);
        };
        
        analyze();
        console.log('✅ Microphone audio analysis started');
        
      } catch (error) {
        console.error('❌ Failed to setup microphone analysis:', error);
      }
    };

    setupMicAnalysis();

    return () => {
      if (micAnalyzerRef.current) {
        if (micAnalyzerRef.current.animationId) {
          cancelAnimationFrame(micAnalyzerRef.current.animationId);
        }
        micAnalyzerRef.current.audioContext.close();
        micAnalyzerRef.current = null;
      }
    };
  }, [microphoneStream, enableMicAnalysis, smoothingFactor]);

  // Speaker analysis (attempt to capture ElevenLabs audio output)
  useEffect(() => {
    if (!enableSpeakerAnalysis) {
      // Clean up existing analyzer
      if (speakerAnalyzerRef.current) {
        if (speakerAnalyzerRef.current.animationId) {
          cancelAnimationFrame(speakerAnalyzerRef.current.animationId);
        }
        speakerAnalyzerRef.current.audioContext.close();
        speakerAnalyzerRef.current = null;
      }
      setSpeakerLevel(0);
      return;
    }

    const setupSpeakerAnalysis = async () => {
      try {
        console.log('🔊 Setting up speaker audio analysis...');
        
        // Try to find ElevenLabs audio elements
        const checkForAudioElements = () => {
          const audioElements = document.querySelectorAll('audio');
          
          // Look for ElevenLabs-related audio elements (check for blob URLs or playing audio)
          for (const audio of audioElements) {
            if (audio.src && audio.src.includes('blob:') && !audio.paused) {
              return audio;
            }
          }
          
          // Fallback: use any playing audio element
          for (const audio of audioElements) {
            if (!audio.paused && !audio.ended && audio.src) {
              return audio;
            }
          }
          
          return null;
        };
        
        const setupAnalyzer = (audioElement: HTMLAudioElement) => {
          const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          try {
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            source.connect(audioContext.destination); // REQUIRED: MediaElementSource takes over audio routing

            speakerAnalyzerRef.current = {
              audioContext,
              analyser,
              dataArray,
              animationId: null
            };
            
            const analyze = () => {
              if (!speakerAnalyzerRef.current) return;
              
              const { analyser, dataArray } = speakerAnalyzerRef.current;
              
              analyser.getByteFrequencyData(dataArray as Uint8Array);
              
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              const normalizedLevel = Math.min(average / 128, 1);
              
              setSpeakerLevel(prev => {
                const smoothed = (1 - smoothingFactor) * normalizedLevel + smoothingFactor * prev;
                return smoothed;
              });
              
              speakerAnalyzerRef.current.animationId = requestAnimationFrame(analyze);
            };
            
            analyze();
            console.log('✅ Speaker audio analysis started');
            return true;
            
          } catch (error) {
            console.log('❌ Could not connect to audio element:', error);
            audioContext.close();
            return false;
          }
        };
        
        // Initial check
        let audioElement = checkForAudioElements();
        if (audioElement) {
          setupAnalyzer(audioElement);
        } else {
          // Check a few times for audio elements, then give up to avoid performance issues
          let attempts = 0;
          const maxAttempts = 5;

          checkIntervalRef.current = window.setInterval(() => {
            attempts++;
            audioElement = checkForAudioElements();
            if (audioElement && !speakerAnalyzerRef.current) {
              setupAnalyzer(audioElement);
              if (checkIntervalRef.current !== null) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
              }
            } else if (attempts >= maxAttempts) {
              console.log('🔊 No audio elements found after', maxAttempts, 'attempts, skipping speaker analysis');
              if (checkIntervalRef.current !== null) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
              }
            }
          }, 1000); // Check every 1 second instead of 500ms
        }
        
      } catch (error) {
        console.error('❌ Failed to setup speaker analysis:', error);
      }
    };

    setupSpeakerAnalysis();

    return () => {
      // Clean up interval if still running
      if (checkIntervalRef.current !== null) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      // Clean up analyzer
      if (speakerAnalyzerRef.current) {
        if (speakerAnalyzerRef.current.animationId) {
          cancelAnimationFrame(speakerAnalyzerRef.current.animationId);
        }
        speakerAnalyzerRef.current.audioContext.close();
        speakerAnalyzerRef.current = null;
      }
    };
  }, [enableSpeakerAnalysis, smoothingFactor]);

  return {
    micLevel,
    speakerLevel,
    // Utility functions
    isMicActive: micLevel > 0.1,
    isSpeakerActive: speakerLevel > 0.1
  };
}