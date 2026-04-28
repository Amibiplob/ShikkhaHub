const express = require("express");
const router = express.Router();

const lessonController = require("../controllers/lessonController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

//
// ✅ ADMIN ROUTES
//
router.post("/", auth, admin, lessonController.createLesson);

//
// ✅ PROTECTED USER ROUTES
//
router.get("/:sectionId", auth, lessonController.getLessons);

module.exports = router;
