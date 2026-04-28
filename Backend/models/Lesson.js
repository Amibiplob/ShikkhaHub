const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    videoUrl: { type: String, default: "", trim: true },
    content: { type: String, default: "", trim: true },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ✅ FIX: prevent overwrite error
module.exports =
  mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);
