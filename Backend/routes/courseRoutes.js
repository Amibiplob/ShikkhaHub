const express = require("express");
const router = express.Router();

const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getMyCourses,
} = require("../controllers/courseController");

const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const { createCourseValidator } = require("../validators/courseValidator");
const validate = require("../middleware/validate");

//
// ✅ USER ROUTES
//
router.get("/my", auth, getMyCourses);
router.post("/:id/enroll", auth, enrollCourse);

//
// ✅ PUBLIC ROUTES
//
router.get("/", getCourses);
router.get("/:id", getCourseById);

//
// ✅ ADMIN ROUTES
//
router.post("/", auth, admin, createCourseValidator, validate, createCourse);

router.put("/:id", auth, admin, updateCourse);
router.delete("/:id", auth, admin, deleteCourse);

module.exports = router;
