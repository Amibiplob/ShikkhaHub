const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    videoUrl: String, // YouTube / upload later
    content: String, // text / notes
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
    order: Number,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lesson", LessonSchema);
