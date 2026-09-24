import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  askDoubt,
  getLesson,
  getLessonContent,
  getLessonHistory
} from "../api.js";
import SourceList from "../components/SourceList.jsx";
import { formatClock, getYouTubeEmbedUrl } from "../youtube.js";

const toChatMessages = (historySessions, sessionId) => {
  const session = historySessions.find((item) => item.session_id === sessionId);
  if (!session) {
    return [];
  }

  return session.messages.map((message) => ({
    role: message.role,
    text: message.role === "user" ? message.question : message.answer,
    sources: message.sources || []
  }));
};

const LessonPage = () => {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("material");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [videoStart, setVideoStart] = useState(23);
  const [highlightedPage, setHighlightedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const studyChunks = useMemo(
    () => chunks.filter((chunk) => chunk.source_type === "STUDY_MATERIAL"),
    [chunks]
  );
  const transcriptChunks = useMemo(
    () => chunks.filter((chunk) => chunk.source_type === "TRANSCRIPT"),
    [chunks]
  );

  const embedUrl = getYouTubeEmbedUrl(lesson?.video_url, videoStart);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [lessonPayload, contentPayload, historyPayload] = await Promise.all([
          getLesson(id),
          getLessonContent(id),
          getLessonHistory(id)
        ]);
        setLesson(lessonPayload.data);
        setChunks(contentPayload.data?.chunks || []);
        setHistory(historyPayload.data || []);
      } catch (err) {
        setError(err.message || "Unable to load this lesson.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const refreshHistory = async () => {
    const historyPayload = await getLessonHistory(id);
    setHistory(historyPayload.data || []);
  };

  useEffect(() => {
    if (highlightedPage == null || tab !== "material") {
      return;
    }
    document.querySelector(".material-card.highlighted")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }, [highlightedPage, tab]);

  const handleAsk = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      setError("Please enter your question.");
      return;
    }

    setError("");
    setAsking(true);
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed, sources: [] }
    ]);
    setQuestion("");

    try {
      const payload = await askDoubt(id, {
        question: trimmed,
        sessionId
      });
      const data = payload.data;
      setSessionId(data.session_id);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer,
          sources: data.sources || []
        }
      ]);
      await refreshHistory();
    } catch (err) {
      setError(err.message || "Unable to generate an answer. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const openSource = (source) => {
    if (source.type === "STUDY_MATERIAL") {
      setTab("material");
      setHighlightedPage(source.page_number);
      return;
    }

    if (source.start_time !== undefined && source.start_time !== null) {
      setVideoStart(source.start_time);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setQuestion("");
    setError("");
  };

  const openHistorySession = (session) => {
    setSessionId(session.session_id);
    setMessages(toChatMessages(history, session.session_id));
    setError("");
  };

  if (loading) {
    return (
      <div className="page">
        <p className="empty">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="page">
        <p className="error">{error || "Lesson not found."}</p>
        <Link className="back-link" to="/">
          ← Back to lessons
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <Link className="back-link" to="/">
            ← All lessons
          </Link>
          <h1 className="brand">{lesson.title}</h1>
        </div>
        <p className="eyebrow">Watch or read, then ask a doubt from this lesson only.</p>
      </header>

      <div className="lesson-layout">
        <section className="panel">
          <h2>Video & study material</h2>
          <div className="video-frame">
            {embedUrl ? (
              <iframe
                key={embedUrl}
                title={lesson.title}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p className="empty">Video is unavailable.</p>
            )}
          </div>

          <div className="tabs">
            <button
              className={tab === "material" ? "tab active" : "tab"}
              onClick={() => setTab("material")}
              type="button"
            >
              Study material
            </button>
            <button
              className={tab === "transcript" ? "tab active" : "tab"}
              onClick={() => setTab("transcript")}
              type="button"
            >
              Transcript
            </button>
          </div>

          <div className="material-list">
            {(tab === "material" ? studyChunks : transcriptChunks).map((chunk) => {
              const highlighted =
                tab === "material" && highlightedPage === chunk.page_number;
              return (
                <article
                  key={chunk.id}
                  className={highlighted ? "material-card highlighted" : "material-card"}
                >
                  <div className="meta">
                    {tab === "material"
                      ? `Page ${chunk.page_number || "-"}`
                      : `Video ${formatClock(chunk.start_time)}`}
                  </div>
                  {chunk.content}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <h2>Ask a doubt</h2>
          <div className="doubt-log">
            {messages.length === 0 && (
              <p className="empty">
                Example: “What is the role of the small intestine?”
              </p>
            )}
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
                <div className="role">{message.role === "user" ? "You" : "AI tutor"}</div>
                <div>{message.text}</div>
                {message.sources?.length > 0 && (
                  <>
                    <SourceList sources={message.sources} onSelect={openSource} />
                    {message.sources
                      .filter((source) => source.quote)
                      .slice(0, 2)
                      .map((source, quoteIndex) => (
                        <p key={quoteIndex} className="source-quote">
                          “{source.quote}”
                        </p>
                      ))}
                  </>
                )}
              </article>
            ))}
            {asking && (
              <p className="status-banner">
                Looking through this lesson’s video and study material...
              </p>
            )}
          </div>

          <form className="composer" onSubmit={handleAsk}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about this lesson"
              disabled={asking}
            />
            {error && <p className="error">{error}</p>}
            <div className="composer-row">
              <button className="ghost-btn" type="button" onClick={startNewChat}>
                New conversation
              </button>
              <button className="primary-btn" type="submit" disabled={asking}>
                {asking ? "Thinking..." : "Ask doubt"}
              </button>
            </div>
          </form>

          <h3>Previous questions</h3>
          <div className="history-list">
            {history.length === 0 && (
              <p className="empty">No doubts asked yet.</p>
            )}
            {history.map((session) => (
              <button
                key={session.session_id}
                type="button"
                className="history-item"
                onClick={() => openHistorySession(session)}
              >
                <strong>Session {session.session_id}</strong>
                {(session.questions || []).slice(0, 4).join(" · ") || "Empty session"}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LessonPage;
