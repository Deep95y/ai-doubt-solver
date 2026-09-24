const AppError = require("../utils/AppError");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5:7b";

const SYSTEM_PROMPT = `You are a Class 10 science tutor for the Human Digestive System lesson.
Answer the student's question using ONLY the provided lesson context (video transcript and study material).
Do not use outside knowledge.
If the context does not contain enough information to answer, reply with exactly NOT_IN_MATERIAL and nothing else.
Keep answers concise, factual, and suitable for a Class 10 student.
If the latest question is a follow-up (for example it uses "it", "this", or "why"), resolve the reference using the conversation history, then answer from the lesson context.`;

const buildUserPrompt = ({ question, context, historyText }) => {
    return [
        "Lesson context:",
        context,
        "",
        historyText ? `Recent conversation:\n${historyText}\n` : "",
        `Student question: ${question}`
    ].join("\n");
};

const generateAnswer = async ({ question, context, history = [] }) => {
    const historyText = history
        .slice(-6)
        .map((message) => {
            if (message.role === "user") {
                return `Student: ${message.question}`;
            }

            return `Tutor: ${message.answer}`;
        })
        .join("\n");

    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                stream: false,
                options: {
                    temperature: 0.1
                },
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: buildUserPrompt({
                            question,
                            context,
                            historyText
                        })
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama chat HTTP ${response.status}`);
        }

        const data = await response.json();
        const answer = data?.message?.content?.trim();

        if (!answer) {
            throw new Error("Ollama returned an empty answer");
        }

        return answer;
    } catch (error) {
        console.error("LLM error:", error.message);
        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(
            "Unable to generate an answer. Please try again.",
            503
        );
    }
};

module.exports = {
    generateAnswer
};
