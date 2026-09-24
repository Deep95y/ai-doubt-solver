const parseError = async (response) => {
  try {
    const payload = await response.json();
    return payload.message || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const getLessons = () => request("/api/lessons");

export const getLesson = (id) => request(`/api/lessons/${id}`);

export const getLessonContent = (id) => request(`/api/lessons/${id}/content`);

export const getLessonHistory = (id) => request(`/api/lessons/${id}/history`);

export const askDoubt = (lessonId, { question, sessionId }) =>
  request(`/api/lessons/${lessonId}/doubts`, {
    method: "POST",
    body: JSON.stringify({
      question,
      session_id: sessionId || undefined
    })
  });
