const fs = require("fs");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "../../.env")
});

const pool = require("../config/database");
const { embedText } = require("../services/embeddingService");

const CONTENT_DIR = path.join(__dirname, "../../../sample-content");
const LESSON_TITLE = "Human Digestive System";
const VIDEO_URL = "https://www.youtube.com/watch?v=AUaVINUiO2I&t=23s";

const loadJson = (filename) => {
    const filePath = path.join(CONTENT_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const ensureSchema = async () => {
    await pool.query(`
        ALTER TABLE content_chunks
        ADD COLUMN IF NOT EXISTS embedding JSONB;
    `);
};

const ensureLesson = async () => {
    const existing = await pool.query(
        "SELECT id FROM lessons WHERE title = $1 LIMIT 1",
        [LESSON_TITLE]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    const created = await pool.query(
        `
        INSERT INTO lessons (title, description, video_url)
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [
            LESSON_TITLE,
            "Learn about the human digestive system, digestion, and the role of different digestive organs.",
            VIDEO_URL
        ]
    );

    return created.rows[0].id;
};

const insertChunk = async (lessonId, chunk) => {
    const embedding = await embedText(chunk.content, { isQuery: false });

    await pool.query(
        `
        INSERT INTO content_chunks (
            lesson_id,
            source_type,
            content,
            page_number,
            start_time,
            end_time,
            embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [
            lessonId,
            chunk.source_type,
            chunk.content,
            chunk.page_number || null,
            chunk.start_time ?? null,
            chunk.end_time ?? null,
            JSON.stringify(embedding)
        ]
    );
};

const ingest = async () => {
    console.log("Preparing database schema...");
    await ensureSchema();

    const lessonId = await ensureLesson();
    console.log(`Using lesson id ${lessonId}`);

    await pool.query(
        "DELETE FROM content_chunks WHERE lesson_id = $1",
        [lessonId]
    );

    const studyMaterial = loadJson("human-digestive-system-study-material.json");
    const transcript = loadJson("human-digestive-system-transcript.json");

    const chunks = [
        ...studyMaterial.map((item) => ({
            source_type: "STUDY_MATERIAL",
            content: `${item.title}. ${item.content}`,
            page_number: item.page_number
        })),
        ...transcript.map((item) => ({
            source_type: "TRANSCRIPT",
            content: item.content,
            start_time: item.start_time,
            end_time: item.end_time
        }))
    ];

    console.log(`Embedding and inserting ${chunks.length} content chunks...`);

    for (let index = 0; index < chunks.length; index += 1) {
        await insertChunk(lessonId, chunks[index]);
        console.log(`  ${index + 1}/${chunks.length} ingested`);
    }

    console.log("Content ingest complete.");
};

ingest()
    .then(async () => {
        await pool.end();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error("Ingest failed:", error.message || error);
        await pool.end().catch(() => {});
        process.exit(1);
    });
