const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // never return password by default
    },

    role: {
      type: String,
      enum: ["user", "admin", "instructor"],
      default: "user",
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
