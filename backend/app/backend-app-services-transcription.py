"""
Real-time speech transcription using OpenAI Whisper
Optimized for streaming with voice activity detection
"""

from __future__ import annotations

import asyncio
import io
import wave
from dataclasses import dataclass
from typing import AsyncIterator, Callable

import numpy as np
import torch
import whisper
from pydantic import BaseModel

from app.core.config import settings


class TranscriptSegment(BaseModel):
    text: str
    language: str
    confidence: float
    is_final: bool
    start_time: float
    end_time: float


@dataclass
class AudioBuffer:
    """Rolling audio buffer for streaming transcription."""
    max_duration: float = 30.0  # seconds
    sample_rate: int = 16000
    
    def __post_init__(self):
        self.buffer: np.ndarray = np.array([], dtype=np.float32)
        self.lock = asyncio.Lock()
    
    async def add(self, audio: np.ndarray) -> None:
        async with self.lock:
            self.buffer = np.concatenate([self.buffer, audio])
            max_samples = int(self.max_duration * self.sample_rate)
            if len(self.buffer) > max_samples:
                self.buffer = self.buffer[-max_samples:]
    
    async def get(self, duration: float | None = None) -> np.ndarray:
        async with self.lock:
            if duration:
                samples = int(duration * self.sample_rate)
                return self.buffer[-samples:].copy()
            return self.buffer.copy()
    
    async def clear(self) -> None:
        async with self.lock:
            self.buffer = np.array([], dtype=np.float32)


class TranscriptionService:
    """
    Real-time transcription service with streaming support.
    Uses Whisper for accuracy, optimized with voice activity detection.
    """
    
    def __init__(self):
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load_model()
        
        # Active buffers per session
        self.buffers: dict[str, AudioBuffer] = {}
        
        # Voice Activity Detection
        self.vad_threshold = 0.5
        self.min_speech_duration = 0.5
        self.silence_duration = 1.0  # seconds of silence to trigger final
        
    def _load_model(self) -> None:
        """Load Whisper model."""
        model_size = settings.WHISPER_MODEL  # "base", "small", "medium"
        self.model = whisper.load_model(model_size).to(self.device)
        print(f"Loaded Whisper {model_size} model on {self.device}")
    
    async def create_session(self, session_id: str) -> None:
        """Create new transcription session."""
        self.buffers[session_id] = AudioBuffer()
    
    async def close_session(self, session_id: str) -> None:
        """Close transcription session."""
        self.buffers.pop(session_id, None)
    
    async def process_chunk(
        self, 
        session_id: str, 
        audio_bytes: bytes,
        language: str | None = None
    ) -> AsyncIterator[TranscriptSegment]:
        """
        Process audio chunk and yield transcripts.
        Uses buffering and VAD for natural turn detection.
        """
        if session_id not in self.buffers:
            await self.create_session(session_id)
        
        buffer = self.buffers[session_id]
        
        # Convert bytes to numpy array (assuming 16-bit PCM)
        audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        await buffer.add(audio)
        
        # Check voice activity
        is_speech = self._detect_speech(audio)
        
        if is_speech:
            # Quick interim result
            interim = await self._transcribe_buffer(buffer, language, partial=True)
            if interim:
                yield TranscriptSegment(
                    text=interim,
                    language=language or "auto",
                    confidence=0.7,
                    is_final=False,
                    start_time=0,
                    end_time=0,
                )
        
        # Check for end of speech (silence)
        # This would need proper timing tracking in production
        buffer_duration = len(await buffer.get()) / buffer.sample_rate
        if buffer_duration > self.silence_duration and not is_speech:
            final = await self._transcribe_buffer(buffer, language, partial=False)
            if final:
                yield TranscriptSegment(
                    text=final,
                    language=language or "auto",
                    confidence=0.95,
                    is_final=True,
                    start_time=0,
                    end_time=buffer_duration,
                )
                await buffer.clear()
    
    def _detect_speech(self, audio: np.ndarray) -> bool:
        """Simple energy-based VAD."""
        energy = np.sqrt(np.mean(audio**2))
        return energy > self.vad_threshold
    
    async def _transcribe_buffer(
        self, 
        buffer: AudioBuffer,
        language: str | None,
        partial: bool = False
    ) -> str | None:
        """Run Whisper transcription on buffer."""
        audio = await buffer.get()
        
        if len(audio) < buffer.sample_rate * 0.5:  # Less than 0.5s
            return None
        
        # Run in thread pool to not block
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._run_whisper,
            audio,
            language,
            partial
        )
        
        return result
    
    def _run_whisper(
        self, 
        audio: np.ndarray,
        language: str | None,
        partial: bool
    ) -> str | None:
        """Synchronous Whisper inference."""
        options = {
            "language": language,
            "task": "transcribe",
            "fp16": self.device == "cuda",
        }
        
        if partial:
            options["best_of"] = 1
            options["beam_size"] = 1
        
        result = self.model.transcribe(audio, **options)
        text = result["text"].strip()
        
        return text if text else None
    
    async def transcribe_file(
        self, 
        audio_path: str,
        language: str | None = None
    ) -> list[TranscriptSegment]:
        """Transcribe entire file with timestamps."""
        result = self.model.transcribe(
            audio_path,
            language=language,
            task="transcribe",
            verbose=False,
        )
        
        segments = []
        for seg in result["segments"]:
            segments.append(TranscriptSegment(
                text=seg["text"].strip(),
                language=result.get("language", "unknown"),
                confidence=seg.get("confidence", 0.9),
                is_final=True,
                start_time=seg["start"],
                end_time=seg["end"],
            ))
        
        return segments