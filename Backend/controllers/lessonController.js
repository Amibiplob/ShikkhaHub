const Lesson = require("../models/Lesson");

//
// ✅ CREATE LESSON
//
exports.createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create({
      ...req.body,
    });

    res.status(201).json({
      message: "Lesson created successfully",
      lesson,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET LESSONS BY SECTION
//
exports.getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({
      section: req.params.sectionId,
    }).sort({ order: 1 });

    res.json({ lessons });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
