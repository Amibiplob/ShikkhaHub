const Course = require("../models/Course");

//
// ✅ CREATE COURSE
//
exports.createCourse = async (req, res) => {
  try {
    const { title, description, thumbnail, price } = req.body;

    const course = await Course.create({
      title,
      description,
      thumbnail,
      price,
      instructor: req.user.id,
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET ALL COURSES
//
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("instructor", "name email");

    res.json({ courses });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET SINGLE COURSE
//
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name email",
    );

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    res.json({ course });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ UPDATE COURSE
//
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    Object.assign(course, req.body);
    await course.save();

    res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ DELETE COURSE
//
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await course.deleteOne();

    res.json({
      message: "Course deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ ENROLL COURSE
//
exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const userId = req.user.id;

    if (course.students.includes(userId)) {
      return res.status(400).json({
        message: "Already enrolled",
      });
    }

    course.students.push(userId);
    await course.save();

    res.json({
      message: "Enrolled successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET MY COURSES
//
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      students: req.user.id,
    }).populate("instructor", "name");

    res.json({ courses });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
