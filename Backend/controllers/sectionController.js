const Section = require("../models/Section");
const Lesson = require("../models/Lesson");

// CREATE SECTION
exports.createSection = async (req, res) => {
  try {
    const section = new Section(req.body);
    await section.save();

    res.status(201).json(section);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET FULL COURSE CONTENT (sections + lessons)
exports.getCourseContent = async (req, res) => {
  try {
    const sections = await Section.find({ course: req.params.courseId }).sort({
      order: 1,
    });

    const result = [];

    for (let sec of sections) {
      const lessons = await Lesson.find({ section: sec._id }).sort({
        order: 1,
      });

      result.push({
        ...sec._doc,
        lessons,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
