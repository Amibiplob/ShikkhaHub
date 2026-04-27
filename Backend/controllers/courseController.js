const Course = require("../models/Course");

// CREATE COURSE
exports.createCourse = async (req, res) => {
  try {
    const { title, description, thumbnail, price } = req.body;

    const course = new Course({
      title,
      description,
      thumbnail,
      price,
      instructor: req.user.id,
    });

    await course.save();

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET ALL COURSES
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("instructor", "name email");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET SINGLE COURSE
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name email",
    );

    if (!course) return res.status(404).json({ msg: "Course not found" });

    res.json(course);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// UPDATE COURSE
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ msg: "Course not found" });

    // only instructor can update
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    Object.assign(course, req.body);
    await course.save();

    res.json(course);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// DELETE COURSE
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ msg: "Course not found" });

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await course.deleteOne();

    res.json({ msg: "Course deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ENROLL IN COURSE
exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ msg: "Course not found" });

    if (course.students.includes(req.user.id)) {
      return res.status(400).json({ msg: "Already enrolled" });
    }

    course.students.push(req.user.id);
    await course.save();

    res.json({ msg: "Enrolled successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      students: req.user.id,
    }).populate("instructor", "name");

    res.json(courses);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
