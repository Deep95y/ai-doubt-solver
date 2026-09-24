const AppError = require("../utils/AppError");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";

const cosineSimilarity = (vectorA, vectorB) => {
    if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length !== vectorB.length) {
        return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < vectorA.length; index += 1) {
        dot += vectorA[index] * vectorB[index];
        normA += vectorA[index] * vectorA[index];
        normB += vectorB[index] * vectorB[index];
    }

    if (!normA || !normB) {
        return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const embedText = async (text, { isQuery = false } = {}) => {
    const prefix = isQuery ? "search_query: " : "search_document: ";
    const prompt = `${prefix}${text}`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                prompt
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama embeddings HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
            throw new Error("Ollama returned an empty embedding");
        }

        return data.embedding;
    } catch (error) {
        console.error("Embedding error:", error.message);
        throw new AppError(
            "Unable to generate an answer. Please try again.",
            503
        );
    }
};

module.exports = {
    cosineSimilarity,
    embedText
};
