# AI Services

## Provider Priority (GroqService)
1. Mistral (MISTRAL_API_KEY) — primary, mistral-small-latest
2. Groq (GROQ_API_KEY) — fallback, llama-3.1-8b-instant
3. Anthropic (ANTHROPIC_API_KEY) — fallback, claude-haiku-4-5

## Endpoints Using AI
- POST /api/projects/{project}/situation-travaux → SituationTravauxController (DQE + daily logs context)
- POST /api/projects/{project}/meeting-report → MeetingReportController (throttle:10,60)
- POST /api/portfolio/ai-analysis → PortfolioAnalysisController (throttle:10,60)

## External Services
- Twilio WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
  - Phone normalization: CI 0XXXXXXXXX → +225XXXXXXXXXX
- MinIO (docker-compose): port 9000 (API), 9001 (console), user minioadmin/minioadmin

## Config Keys (.env)
MISTRAL_API_KEY=LxcYB19yVoUVIZvUUUyhggKRQFHJDo1G
GROQ_API_KEY=gsk_QRQ...
ANTHROPIC_API_KEY=(empty)
