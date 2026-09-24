import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLessons } from "../api.js";

const HomePage = () => {
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await getLessons();
        setLessons(payload.data || []);
      } catch (err) {
        setError(err.message || "Unable to load lessons.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="brand">
          AI <span>Doubt Solver</span>
        </h1>
        <p className="eyebrow">Select a lesson, study, then ask a doubt.</p>
      </header>

      <section className="hero">
        <h2>Ask from the lesson, not the whole internet.</h2>
        <p>
          Answers come only from the selected video and study material, with
          sources you can check.
        </p>
      </section>

      {loading && <p className="empty">Loading lessons...</p>}
      {error && <p className="error">{error}</p>}

      <div className="lesson-grid">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            className="lesson-card"
            to={`/lessons/${lesson.id}`}
          >
            <span className="pill">
              {lesson.content_chunk_count || 0} content chunks
            </span>
            <h3>{lesson.title}</h3>
            <p>{lesson.description}</p>
            <span className="ghost-btn">Open lesson →</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
