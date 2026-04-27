const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  createPost,
  getPosts,
  toggleLike,
  updatePost,
  deletePost,
} = require("../controllers/postController");

router.get("/", getPosts);
router.post("/", auth, createPost);
router.post("/:id/like", auth, toggleLike);

router.put("/:id", auth, updatePost);
router.delete("/:id", auth, deletePost);

module.exports = router;
