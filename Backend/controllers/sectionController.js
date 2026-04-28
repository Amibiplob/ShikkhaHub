const Section = require("../models/Section");
const Lesson = require("../models/Lesson");

//
// ✅ CREATE SECTION
//
exports.createSection = async (req, res) => {
  try {
    const { title, course, order } = req.body;

    const section = await Section.create({
      title,
      course,
      order,
    });

    res.status(201).json({
      message: "Section created",
      section,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET FULL COURSE CONTENT (OPTIMIZED)
//
exports.getCourseContent = async (req, res) => {
  try {
    const sections = await Section.find({
      course: req.params.courseId,
    }).sort({ order: 1 });

    const sectionIds = sections.map((s) => s._id);

    const lessons = await Lesson.find({
      section: { $in: sectionIds },
    }).sort({ order: 1 });

    const grouped = sections.map((sec) => {
      return {
        ...sec._doc,
        lessons: lessons.filter(
          (l) => l.section.toString() === sec._id.toString(),
        ),
      };
    });

    res.json({
      courseId: req.params.courseId,
      sections: grouped,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
