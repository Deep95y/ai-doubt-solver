export const getYouTubeId = (url) => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
};

export const getYouTubeEmbedUrl = (url, startTime = 23) => {
  const id = getYouTubeId(url);
  if (!id) {
    return null;
  }

  const start = Number.isFinite(Number(startTime))
    ? Math.max(0, Math.floor(Number(startTime)))
    : 0;

  return `https://www.youtube.com/embed/${id}?start=${start}&rel=0`;
};

export const formatClock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};
