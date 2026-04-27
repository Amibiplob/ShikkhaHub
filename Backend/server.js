const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const progressRoutes = require("./routes/progressRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));

const courseRoutes = require("./routes/courseRoutes");
const errorHandler = require("./middleware/errorHandler");

app.use(errorHandler);
app.use("/api/courses", courseRoutes);

app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);

app.use("/api/sections", sectionRoutes);
app.use("/api/lessons", lessonRoutes);

app.use("/api/progress", progressRoutes);
app.use("/api/users", userRoutes);
