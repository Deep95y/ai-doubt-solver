const formatTimestamp = (seconds) => {
    if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
        return null;
    }

    const total = Math.max(0, Math.floor(Number(seconds)));
    const minutes = Math.floor(total / 60);
    const remainingSeconds = total % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatVideoRange = (startTime, endTime) => {
    const start = formatTimestamp(startTime);
    const end = formatTimestamp(endTime);

    if (start && end) {
        return `Video: ${start}–${end}`;
    }

    if (start) {
        return `Video: ${start}`;
    }

    return "Video";
};

module.exports = {
    formatTimestamp,
    formatVideoRange
};
