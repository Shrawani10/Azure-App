# Kisan Chat — Azure AI Foundry Agent

A full-stack chat application powered by **Azure AI Foundry Agents**, featuring a React frontend and a FastAPI streaming backend.

## Project Structure

```
.
├── backend/        # FastAPI backend (Python)
│   ├── main.py
│   └── requirements.txt
└── frontend/       # React + Vite frontend
    ├── src/
    │   ├── components/
    │   ├── hooks/
    │   ├── services/
    │   └── i18n/
    ├── public/
    └── .env.example
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- Azure CLI (`az login` with access to an Azure AI Foundry project)

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
cp .env.example .env   # Fill in your Azure credentials
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env` and set the following:

| Variable | Description |
|---|---|
| `VITE_API_ENDPOINT` | Azure OpenAI chat completions endpoint |
| `VITE_API_KEY` | Azure OpenAI API key |
| `VITE_API_BASE_URL` | Azure OpenAI base URL |
| `VITE_SEARCH_ENDPOINT` | *(Optional)* Azure AI Search endpoint for RAG |
| `VITE_SEARCH_INDEX` | *(Optional)* Azure AI Search index name |
| `VITE_SEARCH_KEY` | *(Optional)* Azure AI Search key |

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** FastAPI, Uvicorn, Azure AI Agents SDK
- **Auth:** Azure DefaultAzureCredential (`az login`)
