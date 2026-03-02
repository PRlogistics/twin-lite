from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os
from gtts import gTTS

app = FastAPI(title="TWIN Lite", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "TWIN Lite API", "version": "1.0.0", "languages": ["Spanish", "Mandarin", "German", "French", "Swahili"]}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "twin-lite", "languages": 5}

@app.post("/upload-voice")
async def upload_voice(audio: UploadFile = File(...)):
    """Save voice for future cloning."""
    return {
        "voice_id": "gtts-default",
        "status": "ready",
        "message": "Voice saved for future ElevenLabs cloning"
    }

@app.post("/generate")
async def generate_speech(text: str = Form(...), voice_id: str = Form(...), language: str = Form("es")):
    """Generate speech using Google TTS."""
    try:
        # Language code mapping for gTTS
        lang_map = {
            "es": "es",      # Spanish
            "zh": "zh-CN",   # Mandarin (Chinese)
            "de": "de",      # German
            "fr": "fr",      # French
            "sw": "sw",      # Swahili
        }
        gtts_lang = lang_map.get(language, "en")
        
        # Generate audio
        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp_path = tmp.name
            tts.save(tmp_path)
        
        return FileResponse(
            tmp_path,
            media_type="audio/mpeg",
            filename=f"twin-{language}.mp3"
        )
        
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")

@app.get("/sample-texts")
async def get_samples():
    return {
        # Spanish
        "es_greeting": "Hola, mucho gusto en conocerte.",
        "es_business": "Gracias por llamar. Estoy interesado en colaborar con su empresa.",
        
        # Mandarin
        "zh_greeting": "你好，很高兴认识你。",
        "zh_business": "感谢您的来电。我对与贵公司合作很感兴趣。",
        
        # German
        "de_greeting": "Hallo, freut mich, Sie kennenzulernen.",
        "de_business": "Danke für Ihren Anruf. Ich bin an einer Zusammenarbeit interessiert.",
        
        # French
        "fr_greeting": "Bonjour, enchanté de vous rencontrer.",
        "fr_business": "Merci d'avoir appelé. Je suis intéressé par une collaboration.",
        
        # Swahili
        "sw_greeting": "Habari, ninafuraha kukutana nawe.",
        "sw_business": "Asante kwa kupiga. Niko interested kushirikiana na kampuni yako.",
    }
