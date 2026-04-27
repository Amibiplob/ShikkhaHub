const express = require("express");
const router = express.Router();

const {
  createSection,
  getCourseContent,
} = require("../controllers/sectionController");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.post("/", auth, admin, createSection);
router.get("/:courseId", auth, getCourseContent);

module.exports = router;
