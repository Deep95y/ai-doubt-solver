-- ============================================
-- AI Doubt Solver Database Schema
-- ============================================

-- Embeddings are stored as JSONB so the project runs without
-- installing the pgvector PostgreSQL extension. Similarity is
-- computed in the Node RAG service.


-- ============================================
-- LESSONS
-- ============================================

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    description TEXT,

    video_url TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- CONTENT CHUNKS
-- ============================================
-- Stores video transcript chunks and study material chunks
-- used by the RAG pipeline.

CREATE TABLE IF NOT EXISTS content_chunks (
    id SERIAL PRIMARY KEY,

    lesson_id INTEGER NOT NULL
        REFERENCES lessons(id)
        ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,

    content TEXT NOT NULL,

    page_number INTEGER,

    start_time DECIMAL(10, 2),

    end_time DECIMAL(10, 2),

    embedding JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_source_type
        CHECK (
            source_type IN (
                'VIDEO',
                'TRANSCRIPT',
                'STUDY_MATERIAL'
            )
        )
);


-- ============================================
-- DOUBT SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS doubt_sessions (
    id SERIAL PRIMARY KEY,

    lesson_id INTEGER NOT NULL
        REFERENCES lessons(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- DOUBT MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS doubt_messages (
    id SERIAL PRIMARY KEY,

    session_id INTEGER NOT NULL
        REFERENCES doubt_sessions(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL,

    question TEXT,

    answer TEXT,

    sources JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_message_role
        CHECK (
            role IN ('user', 'assistant')
        )
);


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_content_chunks_lesson_id
ON content_chunks(lesson_id);

CREATE INDEX IF NOT EXISTS idx_doubt_sessions_lesson_id
ON doubt_sessions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_doubt_messages_session_id
ON doubt_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_doubt_messages_created_at
ON doubt_messages(created_at);