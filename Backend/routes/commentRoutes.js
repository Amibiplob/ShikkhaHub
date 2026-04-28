const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const commentController = require("../controllers/commentController");

//
// ✅ Public route
//
router.get("/:postId", commentController.getComments);

//
// ✅ Protected routes
//
router.post("/:postId", auth, commentController.addComment);
router.delete("/:id", auth, commentController.deleteComment);

module.exports = router;
