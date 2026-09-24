const pool = require("../config/database");
const AppError = require("../utils/AppError");

const parseId = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new AppError("Invalid lesson id.", 400);
    }

    return parsed;
};

const getLessons = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT
                l.id,
                l.title,
                l.description,
                l.video_url,
                l.created_at,
                (
                    SELECT COUNT(*)::int
                    FROM content_chunks c
                    WHERE c.lesson_id = l.id
                ) AS content_chunk_count
            FROM lessons l
            ORDER BY l.id;
        `);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};

const getLessonById = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);

        const result = await pool.query(
            `
            SELECT
                l.id,
                l.title,
                l.description,
                l.video_url,
                l.created_at,
                (
                    SELECT COUNT(*)::int
                    FROM content_chunks c
                    WHERE c.lesson_id = l.id
                ) AS content_chunk_count
            FROM lessons l
            WHERE l.id = $1;
            `,
            [id]
        );

        if (result.rows.length === 0) {
            throw new AppError("Lesson not found.", 404);
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

const getLessonContent = async (req, res, next) => {
    try {
        const id = parseId(req.params.id);

        const lesson = await pool.query(
            "SELECT id, title, video_url FROM lessons WHERE id = $1",
            [id]
        );

        if (lesson.rows.length === 0) {
            throw new AppError("Lesson not found.", 404);
        }

        const chunks = await pool.query(
            `
            SELECT
                id,
                source_type,
                content,
                page_number,
                start_time,
                end_time
            FROM content_chunks
            WHERE lesson_id = $1
            ORDER BY
                CASE source_type
                    WHEN 'STUDY_MATERIAL' THEN 1
                    WHEN 'TRANSCRIPT' THEN 2
                    ELSE 3
                END,
                page_number NULLS LAST,
                start_time NULLS LAST,
                id
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                lesson: lesson.rows[0],
                chunks: chunks.rows
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLessons,
    getLessonById,
    getLessonContent
};
