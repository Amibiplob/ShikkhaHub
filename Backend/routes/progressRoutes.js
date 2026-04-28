const express = require("express");
const router = express.Router();

const progressController = require("../controllers/progressController");
const auth = require("../middleware/authMiddleware");

//
// ✅ PROTECTED ROUTES
//

// mark lesson complete
router.post("/complete", auth, progressController.markComplete);

// full progress (must come BEFORE :courseId)
router.get("/:courseId/full", auth, progressController.getFullProgress);

// basic progress
router.get("/:courseId", auth, progressController.getProgress);

module.exports = router;
