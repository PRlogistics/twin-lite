# TWIN Lite

**Speak 5 languages with your own voice.**

Record 1 minute → AI clones your voice → Generate speech in Spanish/Mandarin → Share instantly

## Quick Start (Free Tier)

### 1. Get ElevenLabs API Key (Free)
- Go to https://elevenlabs.io
- Sign up (10,000 characters/month free)
- Copy API key

### 2. Run Locally

```bash
# Clone
git clone https://github.com/YOURNAME/twin-lite.git
cd twin-lite

# Start backend
cd backend
pip install -r requirements.txt
ELEVENLABS_API_KEY=your_key_here uvicorn app.main:app --reload

# Start frontend (new terminal)
cd frontend
npm install
npm run dev