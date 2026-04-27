const Lesson = require("../models/Lesson");

// CREATE LESSON
exports.createLesson = async (req, res) => {
  try {
    const lesson = new Lesson({
      ...req.body,
    });

    await lesson.save();

    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET LESSONS BY SECTION
exports.getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ section: req.params.sectionId }).sort({
      order: 1,
    });

    res.json(lessons);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
