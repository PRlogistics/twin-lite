import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Users, 
  Settings, LogOut, MessageSquare, Copy 
} from 'lucide-react';
import { useRealtimeTranslation } from '@/hooks/useRealtimeTranslation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Waveform } from '@/components/Waveform';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { cn } from '@/lib/utils';

interface TranslationRoomProps {
  roomId: string;
  sourceLanguage: string;
  targetLanguage: string;
  onLeave: () => void;
}

export function TranslationRoom({
  roomId,
  sourceLanguage,
  targetLanguage,
  onLeave,
}: TranslationRoomProps) {
  const [showTranscript, setShowTranscript] = useState(true);
  const [latestTranscript, setLatestTranscript] = useState('');
  const [latestTranslation, setLatestTranslation] = useState('');
  
  const {
    isConnected,
    isRecording,
    participants,
    error,
    startRecording,
    stopRecording,
    toggleMute,
    isMuted,
  } = useRealtimeTranslation({
    roomId,
    sourceLanguage,
    targetLanguage,
    onTranscript: (text, isFinal) => {
      if (isFinal) setLatestTranscript(text);
    },
    onTranslation: (text) => {
      setLatestTranslation(text);
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <GlassCard className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
          <p className="text-white/60 mb-4">{error.message}</p>
          <Button onClick={onLeave}>Go Back</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070A] text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#07070A]/50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#7B61FF]/20 text-[#7B61FF] text-sm font-medium">
              {sourceLanguage.toUpperCase()}
            </span>
            <span className="text-white/40">→</span>
            <span className="px-3 py-1 rounded-full bg-[#7B61FF]/20 text-[#7B61FF] text-sm font-medium">
              {targetLanguage.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(showTranscript && "bg-white/10")}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onLeave} className="text-red-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 px-6 flex gap-6 h-screen">
        {/* Translation Stage */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {!isRecording ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <GlassCard className="p-12 mb-8">
                  <div className="w-24 h-24 rounded-full bg-[#7B61FF]/20 flex items-center justify-center mx-auto mb-6">
                    <Mic className="w-10 h-10 text-[#7B61FF]" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Ready to translate</h2>
                  <p className="text-white/60 mb-6">Click the microphone to start speaking</p>
                  <Button
                    size="lg"
                    onClick={startRecording}
                    className="bg-[#7B61FF] hover:bg-[#6B51EF] px-8"
                  >
                    Start Speaking
                  </Button>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-2xl"
              >
                {/* Live Transcript Display */}
                <GlassCard className="p-8 mb-6 min-h-[200px] flex flex-col items-center justify-center text-center">
                  <AnimatePresence mode="wait">
                    {latestTranslation ? (
                      <motion.div
                        key="translation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <p className="text-sm text-[#7B61FF] font-medium uppercase tracking-wider">
                          Translated to {targetLanguage}
                        </p>
                        <p className="text-4xl md:text-5xl font-semibold leading-tight">
                          {latestTranslation}
                        </p>
                        <p className="text-white/40 text-lg">
                          {latestTranscript}
                        </p>
                      </motion.div>
                    ) : latestTranscript ? (
                      <motion.div
                        key="transcript"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <p className="text-sm text-white/40 mb-2">Listening...</p>
                        <p className="text-3xl md:text-4xl font-medium">
                          {latestTranscript}
                        </p>
                      </motion.div>
                    ) : (
                      <Waveform className="scale-150" />
                    )}
                  </AnimatePresence>
                </GlassCard>

                {/* Participants */}
                <div className="flex justify-center gap-4">
                  {participants.map((participant) => (
                    <GlassCard
                      key={participant.identity}
                      className="px-4 py-2 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B61FF] to-[#A78BFA]" />
                      <span className="text-sm">{participant.identity}</span>
                      <Volume2 className="w-4 h-4 text-green-400" />
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transcript Panel */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-80 hidden lg:block"
            >
              <TranscriptPanel roomId={roomId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Controls */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 backdrop-blur-md bg-[#07070A]/50 border-t border-white/5">
        <Button
          variant="outline"
          size="lg"
          onClick={toggleMute}
          className={cn(
            "rounded-full px-6",
            isMuted && "border-red-400 text-red-400"
          )}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "rounded-full px-8",
            isRecording 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-[#7B61FF] hover:bg-[#6B51EF]"
          )}
        >
          {isRecording ? 'Stop' : 'Start'}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="rounded-full px-6"
        >
          <Copy className="w-5 h-5" />
        </Button>
      </footer>
    </div>
  );
}