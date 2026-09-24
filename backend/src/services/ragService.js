const pool = require("../config/database");
const { cosineSimilarity, embedText } = require("./embeddingService");
const { generateAnswer } = require("./llmService");
const { formatVideoRange } = require("../utils/time");

const UNSUPPORTED_ANSWER =
    "This information is not available in the provided learning material.";

const TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.42;
const KEYWORD_THRESHOLD = 0.4;

const STOP_WORDS = new Set([
    "the", "a", "an", "is", "of", "in", "to", "and", "what", "how", "why",
    "does", "do", "for", "with", "from", "that", "this", "it", "its", "on",
    "are", "was", "be", "or", "as", "by", "at", "into"
]);

const keywordScore = (query, text) => {
    const tokens = query
        .toLowerCase()
        .split(/\W+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

    if (tokens.length === 0) {
        return 0;
    }

    const haystack = text.toLowerCase();
    let hits = 0;

    for (const token of tokens) {
        if (haystack.includes(token)) {
            hits += 1;
        }
    }

    return hits / tokens.length;
};

const buildSearchQuery = (question, history) => {
    const recentQuestions = history
        .filter((message) => message.role === "user" && message.question)
        .slice(-2)
        .map((message) => message.question);

    if (recentQuestions.length === 0) {
        return question;
    }

    return `${recentQuestions.join(" ")} ${question}`;
};

const parseEmbedding = (value) => {
    if (!value) {
        return null;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    return null;
};

const retrieveChunks = async (lessonId, question, history) => {
    const searchQuery = buildSearchQuery(question, history);
    const queryEmbedding = await embedText(searchQuery, { isQuery: true });

    const result = await pool.query(
        `
        SELECT
            id,
            lesson_id,
            source_type,
            content,
            page_number,
            start_time,
            end_time,
            embedding
        FROM content_chunks
        WHERE lesson_id = $1
        `,
        [lessonId]
    );

    const ranked = result.rows
        .map((chunk) => {
            const embedding = parseEmbedding(chunk.embedding);
            const similarity = embedding
                ? cosineSimilarity(queryEmbedding, embedding)
                : 0;
            const lexical = keywordScore(searchQuery, chunk.content);
            const score = embedding
                ? (similarity * 0.85) + (lexical * 0.15)
                : lexical;

            return {
                ...chunk,
                start_time: chunk.start_time === null ? null : Number(chunk.start_time),
                end_time: chunk.end_time === null ? null : Number(chunk.end_time),
                similarity,
                lexical,
                score
            };
        })
        .sort((left, right) => right.score - left.score);

    const relevant = ranked.filter((chunk) => (
        chunk.similarity >= SIMILARITY_THRESHOLD ||
        chunk.lexical >= KEYWORD_THRESHOLD
    ));

    return relevant.slice(0, TOP_K);
};

const quoteFromChunk = (content) => {
    const cleaned = content.replace(/\s+/g, " ").trim();

    if (cleaned.length <= 180) {
        return cleaned;
    }

    return `${cleaned.slice(0, 177).trim()}...`;
};

const buildSources = (chunks) => {
    const sources = [];
    const seen = new Set();

    for (const chunk of chunks) {
        if (chunk.source_type === "STUDY_MATERIAL") {
            const key = `page-${chunk.page_number}-${chunk.id}`;

            if (!seen.has(key)) {
                seen.add(key);
                sources.push({
                    type: "STUDY_MATERIAL",
                    label: chunk.page_number
                        ? `Study Material: Page ${chunk.page_number}`
                        : "Study Material",
                    page_number: chunk.page_number,
                    quote: quoteFromChunk(chunk.content)
                });
            }
        }

        if (chunk.source_type === "TRANSCRIPT" || chunk.source_type === "VIDEO") {
            const videoKey = `video-${chunk.start_time}-${chunk.end_time}`;

            if (chunk.start_time !== null && !seen.has(videoKey)) {
                seen.add(videoKey);
                sources.push({
                    type: "VIDEO",
                    label: formatVideoRange(chunk.start_time, chunk.end_time),
                    start_time: chunk.start_time,
                    end_time: chunk.end_time
                });
            }

            const transcriptKey = `transcript-${chunk.id}`;

            if (!seen.has(transcriptKey)) {
                seen.add(transcriptKey);
                sources.push({
                    type: "TRANSCRIPT",
                    label: "Transcript",
                    start_time: chunk.start_time,
                    end_time: chunk.end_time,
                    quote: quoteFromChunk(chunk.content)
                });
            }
        }
    }

    return sources.slice(0, 6);
};

const answerQuestion = async ({ lessonId, question, history = [] }) => {
    const chunks = await retrieveChunks(lessonId, question, history);

    if (chunks.length === 0) {
        return {
            answer: UNSUPPORTED_ANSWER,
            sources: [],
            in_material: false
        };
    }

    const context = chunks
        .map((chunk, index) => {
            const origin = chunk.source_type === "STUDY_MATERIAL"
                ? `Study material page ${chunk.page_number || "?"}`
                : `Video ${formatVideoRange(chunk.start_time, chunk.end_time)}`;

            return `[${index + 1}] ${origin}\n${chunk.content}`;
        })
        .join("\n\n");

    const generated = await generateAnswer({
        question,
        context,
        history
    });

    if (/^NOT_IN_MATERIAL\b/i.test(generated.trim())) {
        return {
            answer: UNSUPPORTED_ANSWER,
            sources: [],
            in_material: false
        };
    }

    return {
        answer: generated,
        sources: buildSources(chunks),
        in_material: true
    };
};

module.exports = {
    answerQuestion,
    UNSUPPORTED_ANSWER
};
