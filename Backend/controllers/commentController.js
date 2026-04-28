const Comment = require("../models/Comment");

//
// ✅ ADD COMMENT
//
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    const comment = await Comment.create({
      content,
      post: req.params.postId,
      author: req.user.id,
    });

    res.status(201).json({
      message: "Comment added",
      comment,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET COMMENTS
//
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "name")
      .sort({ createdAt: -1 });

    res.json({
      comments,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ DELETE COMMENT
//
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (!req.user || comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await comment.deleteOne();

    res.json({
      message: "Comment deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
