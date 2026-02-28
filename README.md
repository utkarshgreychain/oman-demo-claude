# Oman Demo

A full-stack application with a microservices backend (FastAPI/Python) and a React + Vite frontend.

## Architecture

- **Frontend** — React + TypeScript + Tailwind CSS, served via Vite (dev) or Nginx (production)
- **Backend** — Python microservices built with FastAPI:
  - **Gateway** (`:8000`) — API gateway and request routing
  - **LLM Service** (`:8001`) — Multi-provider LLM integration (OpenAI, Anthropic, Google, Groq)
  - **Search Service** (`:8002`) — Search functionality
  - **File Service** (`:8003`) — File upload and processing (PDF, DOCX, Excel)
  - **Viz Service** (`:8004`) — Data visualization (Matplotlib, Plotly)
  - **Config Service** (`:8005`) — Configuration management
- **Database** — SQLite via SQLAlchemy + aiosqlite

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/utkarshgreychain/oman-demo-claude.git
   cd oman-demo-claude
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

   Or run services individually — see the backend and frontend directories for details.

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
# Start individual services as needed
```

### Tests
```bash
npm test              # Run Playwright tests
npm run test:headed   # Run tests in headed mode
npm run test:report   # View test report
```
