const mongoose = require("mongoose");

const SectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    order: Number,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Section", SectionSchema);
