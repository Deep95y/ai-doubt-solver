# AI Doubt Solver

Students select a lesson, watch the video or read the study material, ask a doubt, and receive an answer grounded only in that lesson. Sources are shown as video timestamps, transcript quotes, and study-material pages.

This repository is the assignment submission: source code, setup, sample content, database schema, and a short explanation of the AI approach.

## Deliverables

| Required | Where it is |
|---|---|
| Source code | `backend/` and `frontend/` |
| Setup instructions | [Setup](#setup) below |
| README | this file |
| Sample learning content | `sample-content/` |
| Database / schema setup | `database/schema.sql`, `database/seed.sql` |
| Short explanation of the AI approach | [AI approach](#ai-approach) below |

## Tech stack

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **AI:** Ollama locally — `nomic-embed-text` for embeddings, `qwen2.5:7b` for answers
- **RAG:** lesson-scoped retrieval over transcript + study-material chunks

## Project structure

```text
ai-doubt-solver/
  backend/                 Express API, RAG, ingest script
  frontend/                React UI
  database/
    schema.sql             Tables for lessons, chunks, sessions, messages
    seed.sql               Sample lesson row
  sample-content/          Video transcript, study guide, PDF
  README.md
```

## AI approach

The system uses **retrieval-augmented generation (RAG)** so answers come from the selected lesson, not from the model’s general knowledge.

1. **Chunking.** The Human Digestive System lesson is stored as chunks:
   - study-material sections with **page numbers**
   - transcript segments with **start/end times**
2. **Embeddings.** `npm run ingest` embeds each chunk with Ollama `nomic-embed-text` and saves the vector in `content_chunks.embedding` (JSONB, so pgvector is not required).
3. **Retrieve only this lesson.** A student question is embedded and compared with chunks where `lesson_id` matches the selected lesson. Unrelated lessons cannot leak into the answer.
4. **Generate.** The top matching chunks plus recent chat history are sent to Ollama `qwen2.5:7b`. History lets follow-ups like “Why is it coiled?” resolve “it” from the previous question.
5. **Sources.** The API returns the chunks used, formatted as:
   - Video: `04:20–05:10`
   - Study material: Page 3
   - Transcript quote
6. **Unsupported questions.** If retrieval finds nothing relevant, or the model replies that the context is insufficient, the system returns:  
   `This information is not available in the provided learning material.`  
   Example: “Who invented the telephone?”
7. **Errors.** Empty questions return `Please enter your question.` If Ollama is down: `Unable to generate an answer. Please try again.`

## Sample learning content

Lesson: **Human Digestive System** (assignment video + study guide)

| File | Purpose |
|---|---|
| [sample-content/human-digestion-study-guide-v2.pdf](sample-content/human-digestion-study-guide-v2.pdf) | Original study material PDF |
| [sample-content/human-digestive-system-study-material.json](sample-content/human-digestive-system-study-material.json) | Page-tagged chunks used for RAG |
| [sample-content/human-digestive-system-transcript.json](sample-content/human-digestive-system-transcript.json) | Timestamped transcript chunks |
| [sample-content/digestive-system.txt](sample-content/digestive-system.txt) | Short overview notes |

Video: https://www.youtube.com/watch?v=AUaVINUiO2I&t=23s

## Database / schema

Defined in `database/schema.sql`:

- **lessons** — title, description, video URL
- **content_chunks** — lesson content (transcript / study material), page, timestamps, embedding
- **doubt_sessions** — one conversation for a lesson
- **doubt_messages** — user questions, AI answers, sources (JSONB)

`database/seed.sql` inserts the Human Digestive System lesson. Chunks and embeddings are added by `npm run ingest`.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (default port **5432**; this project’s `.env.example` uses **5433** because a local install was running there — match your own port)
- [Ollama](https://ollama.com) with:

```bat
ollama pull nomic-embed-text
ollama pull qwen2.5:7b
```

Keep Ollama running (`ollama serve` if it is not already).

### 1. Database

From the project root, create the database and apply schema + seed. Adjust the `psql` path and port if needed.

```bat
psql -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "CREATE DATABASE ai_doubt_solver;"
psql -h 127.0.0.1 -p 5433 -U postgres -d ai_doubt_solver -f database/schema.sql
psql -h 127.0.0.1 -p 5433 -U postgres -d ai_doubt_solver -f database/seed.sql
```

On Windows, if `psql` is not on PATH:

```bat
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "CREATE DATABASE ai_doubt_solver;"
```

### 2. Backend

```bat
cd backend
copy .env.example .env
```

Edit `.env`:

- `DB_PORT` — your Postgres port (`5432` or `5433`)
- `DB_PASSWORD` — your `postgres` user password
- `LLM_MODEL=qwen2.5:7b` (or `qwen2.5:3b` for faster answers)
- `EMBEDDING_MODEL=nomic-embed-text`

Then:

```bat
npm install
npm run ingest
npm run dev
```

Ingest loads sample content into `content_chunks` and creates embeddings. Backend: http://localhost:5000  
Health check: http://localhost:5000/api/health

### 3. Frontend

In a second terminal, with the backend still running:

```bat
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (Vite may pick another port if 5173 is busy).

The UI flow is: **Select lesson → watch video / read study material → ask doubt → view sources → follow-ups / previous questions.**

## Demo questions

On the Human Digestive System lesson:

- What is the role of the small intestine?
- Where does digestion begin?
- Why does it start there? *(follow-up in the same conversation)*
- Who invented the telephone? *(should say the information is not in the material)*

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/lessons` | List lessons |
| GET | `/api/lessons/:id` | Lesson details |
| GET | `/api/lessons/:id/content` | Study material + transcript chunks |
| POST | `/api/lessons/:id/doubts` | Ask a doubt (`question`, optional `session_id`) |
| GET | `/api/lessons/:id/history` | Previous questions and answers |

## What to submit

Zip or push this repository. Include source, `database/`, `sample-content/`, and this README.

Do **not** include:

- `node_modules/`
- `backend/.env` (it contains your database password)
- `frontend/dist/`

Use `backend/.env.example` as the template for reviewers.
