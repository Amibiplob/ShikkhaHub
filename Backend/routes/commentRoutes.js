const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  addComment,
  getComments,
  deleteComment,
} = require("../controllers/commentController");

router.get("/:postId", getComments);
router.post("/:postId", auth, addComment);
router.delete("/:id", auth, deleteComment);

module.exports = router;
