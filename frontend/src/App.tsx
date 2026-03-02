import React, { useState } from "react";
import { Mic, Globe, Download, RefreshCw } from "lucide-react";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { TextSelector } from "./components/TextSelector";
import "./App.css";

function App() {
  const [step, setStep] = useState("record");
  const [voiceId, setVoiceId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [language, setLanguage] = useState("es");
  const [error, setError] = useState(null);

  const languages = [
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "zh", name: "Mandarin", flag: "🇨🇳" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "sw", name: "Swahili", flag: "🇰🇪" },
  ];

  const handleVoiceUploaded = (id) => {
    console.log("Voice uploaded, ID:", id);
    setVoiceId(id);
    setStep("select");
  };

  const handleTextSelected = async (text) => {
    if (!voiceId) {
      setError("No voice ID available");
      return;
    }
    
    setStep("generate");
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("voice_id", voiceId);
      formData.append("language", language);
      
      const response = await fetch("http://localhost:8000/generate", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Generation failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setStep("play");
      
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setStep("select");
    }
  };

  const downloadAudio = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `twin-voice-${language}.mp3`;
    a.click();
  };

  const currentLang = languages.find(l => l.code === language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
            <Globe className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">TWIN Lite</h1>
        </div>
        <div className="text-sm text-purple-300">
          5 Languages • Your Voice • Global Communication
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 text-red-200">
            Error: {error}
          </div>
        )}
        
        {step === "record" && (
          <VoiceRecorder onUpload={handleVoiceUploaded} />
        )}
        
        {step === "select" && (
          <>
            <TextSelector 
              onSelect={handleTextSelected}
              language={language}
              onLanguageChange={setLanguage}
            />
            {/* 5 Language selector buttons */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-4 py-2 rounded-full transition ${
                    language === lang.code 
                      ? "bg-purple-500" 
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          </>
        )}
        
        {step === "generate" && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg">Generating audio in {currentLang?.name}...</p>
            <p className="text-sm text-gray-400 mt-2">Using Google TTS (free tier)</p>
            <p className="text-xs text-gray-500 mt-1">Upgrade to ElevenLabs for your cloned voice</p>
          </div>
        )}
        
        {step === "play" && audioUrl && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Done!</h2>
            <p className="text-gray-300 mb-2">
              Audio generated in <span className="text-purple-400 font-semibold">{currentLang?.name}</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {currentLang?.flag} {currentLang?.name} audio ready
            </p>
            
            <audio src={audioUrl} controls className="w-full mb-6" />
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4" />
                New
              </button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-xs text-gray-500">
        TWIN Lite v1.0 • Built with React + FastAPI + gTTS • Upgrade to ElevenLabs for voice cloning
      </footer>
    </div>
  );
}

export default App;
