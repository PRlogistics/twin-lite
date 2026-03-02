/**
 * Hook for real-time voice translation using WebRTC + WebSocket
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalTrack } from 'livekit-client';
import { useAuthStore } from '@/stores/auth';
import { useTranslationStore } from '@/stores/translation';

interface UseRealtimeTranslationOptions {
  roomId: string;
  sourceLanguage: string;
  targetLanguage: string;
  voiceProfile?: 'female' | 'male' | 'neutral';
  onTranscript?: (text: string, isFinal: boolean) => void;
  onTranslation?: (text: string, fromLanguage: string) => void;
}

interface TranslationSession {
  isConnected: boolean;
  isRecording: boolean;
  participants: RemoteParticipant[];
  localAudioTrack: LocalTrack | null;
  error: Error | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleMute: () => void;
  isMuted: boolean;
}

export function useRealtimeTranslation(
  options: UseRealtimeTranslationOptions
): TranslationSession {
  const { roomId, sourceLanguage, targetLanguage, onTranscript, onTranslation } = options;
  const { token } = useAuthStore();
  const { addMessage } = useTranslationStore();
  
  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Initialize WebSocket connection for translation
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/translate/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Send authentication
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'transcript':
          onTranscript?.(data.text, data.is_final);
          addMessage({
            type: 'transcript',
            text: data.text,
            language: data.language,
            isFinal: data.is_final,
            timestamp: Date.now(),
          });
          break;
          
        case 'translation':
          onTranslation?.(data.translated_text, data.source_language);
          addMessage({
            type: 'translation',
            originalText: data.original_text,
            translatedText: data.translated_text,
            sourceLanguage: data.source_language,
            targetLanguage: data.target_language,
            speakerName: data.speaker_name,
            timestamp: Date.now(),
          });
          break;
          
        case 'user_joined':
        case 'user_left':
          // Update participants list
          break;
          
        case 'error':
          setError(new Error(data.message));
          break;
      }
    };

    ws.onerror = (err) => {
      setError(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomId, token]);

  // Initialize LiveKit for audio streaming
  useEffect(() => {
    const initRoom = async () => {
      try {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            simulcast: true,
          },
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          setParticipants((prev) => [...prev, participant]);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setParticipants((prev) => 
            prev.filter((p) => p.identity !== participant.identity)
          );
        });

        await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);
        roomRef.current = room;
      } catch (err) {
        setError(err as Error);
      }
    };

    initRoom();

    return () => {
      roomRef.current?.disconnect();
    };
  }, [token]);

  // Audio processing for speech recognition
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Buffer for audio chunks
      let audioBuffer: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(new Float32Array(inputData));

        // Send every ~100ms (1600 samples at 16kHz)
        if (audioBuffer.length >= 10) {
          const concatenated = concatenateFloat32Arrays(audioBuffer);
          const pcmData = floatTo16BitPCM(concatenated);
          
          // Send via WebSocket
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcmData);
          }
          
          audioBuffer = [];
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
    } catch (err) {
      setError(err as Error);
    }
  }, [isMuted]);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    streamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  }, []);

  return {
    isConnected,
    isRecording,
    participants,
    localAudioTrack: null, // Would get from LiveKit
    error,
    startRecording,
    stopRecording,
    toggleMute,
    isMuted,
  };
}

// Helper functions
function concatenateFloat32Arrays(arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}