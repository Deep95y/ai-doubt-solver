const errorHandler = (err, req, res, next) => {
    console.error(err);

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500
        ? "Something went wrong. Please try again."
        : err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = errorHandler;
