const express = require("express");

const {
    getLessons,
    getLessonById,
    getLessonContent
} = require("../controllers/lessonController");

const {
    askDoubt,
    getLessonHistory
} = require("../controllers/doubtController");

const router = express.Router();

router.get("/", getLessons);
router.get("/:id/content", getLessonContent);
router.get("/:id/history", getLessonHistory);
router.post("/:id/doubts", askDoubt);
router.get("/:id", getLessonById);

module.exports = router;
