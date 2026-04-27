const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  markComplete,
  getProgress,
  getFullProgress,
} = require("../controllers/progressController");

router.post("/complete", auth, markComplete);
router.get("/:courseId", auth, getProgress);
router.get("/:courseId/full", auth, getFullProgress);

module.exports = router;
