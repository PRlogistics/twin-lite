"""
Translation service with multiple provider support.
Primary: DeepL or Google Cloud Translation
Fallback: LibreTranslate self-hosted
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import AsyncIterator

import aiohttp
from google.cloud import translate_v2 as translate
from pydantic import BaseModel

from app.core.config import settings
from app.core.cache import redis_cache


class TranslationResult(BaseModel):
    text: str
    source_language: str
    target_language: str
    confidence: float
    provider: str


@dataclass
class StreamingTranslation:
    """Streaming translation with partial results."""
    original_text: str
    translated_text: str
    is_complete: bool


class TranslationService:
    """
    High-performance translation service with caching and streaming.
    """
    
    def __init__(self):
        self.google_client = None
        self.deepl_api_key = settings.DEEPL_API_KEY
        self.libretranslate_url = settings.LIBRETRANSLATE_URL
        
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            self.google_client = translate.Client()
        
        # Cache common phrases
        self._cache_prefix = "translation:"
        self._cache_ttl = 86400  # 24 hours
    
    async def translate(
        self,
        text: str,
        source: str,
        target: str,
        use_cache: bool = True
    ) -> TranslationResult:
        """
        Translate text with caching.
        """
        if not text or not text.strip():
            return TranslationResult(
                text="",
                source_language=source,
                target_language=target,
                confidence=0,
                provider="none"
            )
        
        # Check cache
        cache_key = f"{self._cache_prefix}{source}:{target}:{hash(text)}"
        if use_cache:
            cached = await redis_cache.get(cache_key)
            if cached:
                return TranslationResult(**cached)
        
        # Try providers in order of quality
        result = None
        
        # 1. DeepL (best quality)
        if self.deepl_api_key:
            result = await self._translate_deepl(text, source, target)
        
        # 2. Google Cloud
        if not result and self.google_client:
            result = await self._translate_google(text, source, target)
        
        # 3. Self-hosted LibreTranslate
        if not result and self.libretranslate_url:
            result = await self._translate_libre(text, source, target)
        
        if not result:
            raise TranslationError("All translation providers failed")
        
        # Cache result
        if use_cache:
            await redis_cache.set(cache_key, result.dict(), ex=self._cache_ttl)
        
        return result
    
    async def translate_streaming(
        self,
        text_stream: AsyncIterator[str],
        source: str,
        target: str
    ) -> AsyncIterator[StreamingTranslation]:
        """
        Stream translation as text comes in (for real-time).
        Translates sentence-by-sentence.
        """
        buffer = ""
        
        async for text in text_stream:
            buffer += text
            
            # Check for sentence boundaries
            if any(c in buffer for c in ".!?。！？"):
                # Split into sentences
                sentences = self._split_sentences(buffer)
                buffer = sentences.pop() if not buffer[-1] in ".!?。！？" else ""
                
                for sentence in sentences:
                    result = await self.translate(sentence, source, target)
                    yield StreamingTranslation(
                        original_text=sentence,
                        translated_text=result.text,
                        is_complete=True
                    )
        
        # Translate remaining buffer
        if buffer.strip():
            result = await self.translate(buffer, source, target)
            yield StreamingTranslation(
                original_text=buffer,
                translated_text=result.text,
                is_complete=True
            )
    
    async def _translate_deepl(
        self,
        text: str,
        source: str,
        target: str
    ) -> TranslationResult | None:
        """DeepL API translation."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api-free.deepl.com/v2/translate",
                    headers={"Authorization": f"DeepL-Auth-Key {self.deepl_api_key}"},
                    data={
                        "text": text,
                        "source_lang": source.upper(),
                        "target_lang": target.upper(),
                    }
                ) as resp:
                    if resp.status != 200:
                        return None
                    
                    data = await resp.json()
                    translation = data["translations"][0]
                    
                    return TranslationResult(
                        text=translation["text"],
                        source_language=translation.get("detected_source_language", source).lower(),
                        target_language=target,
                        confidence=0.95,
                        provider="deepl"
                    )
        except Exception:
            return None
    
    async def _translate_google(
        self,
        text: str,
        source: str,
        target: str
    ) -> TranslationResult | None:
        """Google Cloud Translation."""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.google_client.translate,
                text,
                target_language=target,
                source_language=source if source != "auto" else None
            )
            
            return TranslationResult(
                text=result["translatedText"],
                source_language=result.get("detectedSourceLanguage", source),
                target_language=target,
                confidence=0.9,
                provider="google"
            )
        except Exception:
            return None
    
    async def _translate_libre(
        self,
        text: str,
        source: str,
        target: str
    ) -> TranslationResult | None:
        """Self-hosted LibreTranslate."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.libretranslate_url}/translate",
                    json={
                        "q": text,
                        "source": source,
                        "target": target,
                        "format": "text"
                    }
                ) as resp:
                    if resp.status != 200:
                        return None
                    
                    data = await resp.json()
                    
                    return TranslationResult(
                        text=data["translatedText"],
                        source_language=source,
                        target_language=target,
                        confidence=0.8,
                        provider="libretranslate"
                    )
        except Exception:
            return None
    
    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        import re
        # Simple sentence splitting
        sentences = re.split(r'([.!?。！？]+)', text)
        # Rejoin punctuation with sentences
        result = []
        for i in range(0, len(sentences) - 1, 2):
            if i + 1 < len(sentences):
                result.append(sentences[i] + sentences[i + 1])
            else:
                result.append(sentences[i])
        return [s.strip() for s in result if s.strip()]


class TranslationError(Exception):
    pass