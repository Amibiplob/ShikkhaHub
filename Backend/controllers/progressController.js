const Progress = require("../models/Progress");
const Lesson = require("../models/Lesson");
const Section = require("../models/Section");

// MARK COMPLETE
exports.markComplete = async (req, res) => {
  try {
    const { lessonId, courseId } = req.body;

    let progress = await Progress.findOne({
      user: req.user.id,
      course: courseId,
    });

    if (!progress) {
      progress = new Progress({
        user: req.user.id,
        course: courseId,
        completedLessons: [],
      });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    await progress.save();

    res.json(progress);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET PROGRESS
exports.getProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({
      user: req.user.id,
      course: req.params.courseId,
    });

    res.json(progress || { completedLessons: [] });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET FULL PROGRESS
exports.getFullProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({
      user: req.user.id,
      course: req.params.courseId,
    });

    const sections = await Section.find({
      course: req.params.courseId,
    });

    let totalLessons = 0;

    for (let sec of sections) {
      totalLessons += await Lesson.countDocuments({
        section: sec._id,
      });
    }

    const completed = progress?.completedLessons.length || 0;

    const percent = totalLessons === 0 ? 0 : (completed / totalLessons) * 100;

    res.json({
      completedLessons: progress?.completedLessons || [],
      percent,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
