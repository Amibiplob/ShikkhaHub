const Comment = require("../models/Comment");

// ADD COMMENT
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    const comment = new Comment({
      content,
      post: req.params.postId,
      author: req.user.id,
    });

    await comment.save();

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET COMMENTS
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "name")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const Comment = require("../models/Comment");

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await comment.deleteOne();

    res.json({ msg: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
