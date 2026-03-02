import React, { useState, useRef } from "react";
import { Mic, StopCircle } from "lucide-react";

export function VoiceRecorder({ onUpload }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    chunks.current = [];
    
    mediaRecorder.current.ondataavailable = (e) => {
      chunks.current.push(e.data);
    };
    
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/mp3" });
      setAudioBlob(blob);
    };
    
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const uploadVoice = async () => {
    if (!audioBlob) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice.mp3");
    
    try {
      const response = await fetch("http://localhost:8000/upload-voice", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      onUpload(data.voice_id);
    } catch (error) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Record Your Voice</h2>
      <p className="text-gray-300 mb-6">
        Read these 3 sentences clearly (30 seconds):
      </p>
      
      <div className="bg-black/30 rounded-lg p-4 mb-6 text-left">
        <p className="mb-2">1. "Hello, my name is [your name]. I am excited to use TWIN."</p>
        <p className="mb-2">2. "I believe technology can break language barriers."</p>
        <p>3. "Thank you for calling. I look forward to our conversation."</p>
      </div>

      {!audioBlob ? (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-500 hover:bg-purple-600'}`}
        >
          {isRecording ? <StopCircle className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>
      ) : (
        <div className="space-y-4">
          <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setAudioBlob(null)}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700"
            >
              Re-record
            </button>
            <button
              onClick={uploadVoice}
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Continue →"}
            </button>
          </div>
        </div>
      )}
      
      {isRecording && (
        <p className="text-red-400 animate-pulse">Recording... Click to stop</p>
      )}
    </div>
  );
}
