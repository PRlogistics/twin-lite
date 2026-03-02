import React from "react";
import { Download, Share2, RefreshCw } from "lucide-react";

export function AudioPlayer({ audioUrl, language }) {
  const langName = language === "es" ? "Spanish" : "Mandarin";
  
  const downloadAudio = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `twin-voice-${language}.mp3`;
    a.click();
  };

  const shareAudio = async () => {
    if (navigator.share) {
      const file = new File([await fetch(audioUrl).then(r => r.blob())], "twin-voice.mp3", { type: "audio/mp3" });
      await navigator.share({
        title: `My voice speaking ${langName}`,
        text: "Generated with TWIN Lite",
        files: [file],
      });
    } else {
      alert("Sharing not supported on this browser. Download and share manually.");
    }
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Done!</h2>
      <p className="text-gray-300 mb-6">
        Your voice speaking <span className="text-purple-400 font-semibold">{langName}</span>
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
          onClick={shareAudio}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
        >
          <Share2 className="w-4 h-4" />
          Share
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
  );
}
