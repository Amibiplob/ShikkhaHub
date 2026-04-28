const express = require("express");
const router = express.Router();

const sectionController = require("../controllers/sectionController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

//
// ✅ ADMIN ROUTES
//
router.post("/", auth, admin, sectionController.createSection);

//
// ✅ PROTECTED USER ROUTES
//
router.get("/:courseId", auth, sectionController.getCourseContent);

module.exports = router;
