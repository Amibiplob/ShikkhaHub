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

router.get("/my", auth, getMyCourses);

// PUBLIC
router.get("/", getCourses);
router.get("/:id", getCourseById);

// PROTECTED
router.post("/", auth, createCourse);
router.put("/:id", auth, updateCourse);
router.delete("/:id", auth, deleteCourse);
router.post("/:id/enroll", auth, enrollCourse);

module.exports = router;

// PUBLIC
router.get("/", getCourses);
router.get("/:id", getCourseById);

// ADMIN ONLY
router.post("/", auth, admin, createCourse);
router.put("/:id", auth, admin, updateCourse);
router.delete("/:id", auth, admin, deleteCourse);

// USER
router.post("/:id/enroll", auth, enrollCourse);

router.post("/", auth, admin, createCourseValidator, validate, createCourse);
