const express = require("express");
const router = express.Router();

const { createLesson, getLessons } = require("../controllers/lessonController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.post("/", auth, admin, createLesson);
router.get("/:sectionId", auth, getLessons);

module.exports = router;
