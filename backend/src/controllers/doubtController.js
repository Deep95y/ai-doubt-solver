const pool = require("../config/database");
const AppError = require("../utils/AppError");
const { answerQuestion } = require("../services/ragService");

const parseId = (value, label) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new AppError(`Invalid ${label}.`, 400);
    }

    return parsed;
};

const getLessonOrThrow = async (lessonId) => {
    const result = await pool.query(
        "SELECT id, title FROM lessons WHERE id = $1",
        [lessonId]
    );

    if (result.rows.length === 0) {
        throw new AppError("Lesson not found.", 404);
    }

    return result.rows[0];
};

const loadSessionHistory = async (sessionId) => {
    const result = await pool.query(
        `
        SELECT
            id,
            role,
            question,
            answer,
            sources,
            created_at
        FROM doubt_messages
        WHERE session_id = $1
        ORDER BY created_at ASC, id ASC
        `,
        [sessionId]
    );

    return result.rows;
};

const getOrCreateSession = async (lessonId, sessionId) => {
    if (!sessionId) {
        const created = await pool.query(
            `
            INSERT INTO doubt_sessions (lesson_id)
            VALUES ($1)
            RETURNING id, lesson_id, created_at
            `,
            [lessonId]
        );

        return created.rows[0];
    }

    const existing = await pool.query(
        `
        SELECT id, lesson_id, created_at
        FROM doubt_sessions
        WHERE id = $1
        `,
        [sessionId]
    );

    if (existing.rows.length === 0) {
        throw new AppError("Doubt session not found.", 404);
    }

    if (Number(existing.rows[0].lesson_id) !== Number(lessonId)) {
        throw new AppError(
            "This session does not belong to the selected lesson.",
            400
        );
    }

    return existing.rows[0];
};

const askDoubt = async (req, res, next) => {
    try {
        const lessonId = parseId(req.params.id, "lesson id");
        const question = typeof req.body.question === "string"
            ? req.body.question.trim()
            : "";
        const sessionIdInput = req.body.session_id;

        if (!question) {
            throw new AppError("Please enter your question.", 400);
        }

        if (question.length > 2000) {
            throw new AppError("Question is too long.", 400);
        }

        await getLessonOrThrow(lessonId);

        const chunkCount = await pool.query(
            "SELECT COUNT(*)::int AS count FROM content_chunks WHERE lesson_id = $1",
            [lessonId]
        );

        if (chunkCount.rows[0].count === 0) {
            throw new AppError(
                "Lesson content is not ingested yet. Run npm run ingest from the backend folder.",
                503
            );
        }

        const session = await getOrCreateSession(
            lessonId,
            sessionIdInput ? parseId(sessionIdInput, "session id") : null
        );

        const history = await loadSessionHistory(session.id);
        const result = await answerQuestion({
            lessonId,
            question,
            history
        });

        await pool.query(
            `
            INSERT INTO doubt_messages (session_id, role, question)
            VALUES ($1, 'user', $2)
            `,
            [session.id, question]
        );

        const savedAnswer = await pool.query(
            `
            INSERT INTO doubt_messages (session_id, role, answer, sources)
            VALUES ($1, 'assistant', $2, $3::jsonb)
            RETURNING id, created_at
            `,
            [session.id, result.answer, JSON.stringify(result.sources)]
        );

        res.status(201).json({
            success: true,
            data: {
                session_id: session.id,
                lesson_id: lessonId,
                question,
                answer: result.answer,
                sources: result.sources,
                in_material: result.in_material,
                created_at: savedAnswer.rows[0].created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

const getLessonHistory = async (req, res, next) => {
    try {
        const lessonId = parseId(req.params.id, "lesson id");
        await getLessonOrThrow(lessonId);

        const sessions = await pool.query(
            `
            SELECT id, lesson_id, created_at
            FROM doubt_sessions
            WHERE lesson_id = $1
            ORDER BY created_at DESC, id DESC
            `,
            [lessonId]
        );

        const history = [];

        for (const session of sessions.rows) {
            const messages = await loadSessionHistory(session.id);
            const questions = messages
                .filter((message) => message.role === "user" && message.question)
                .map((message) => message.question);

            history.push({
                session_id: session.id,
                created_at: session.created_at,
                questions,
                messages
            });
        }

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    askDoubt,
    getLessonHistory
};
