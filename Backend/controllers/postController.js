const Post = require("../models/Post");

//
// ✅ CREATE POST
//
exports.createPost = async (req, res) => {
  try {
    const { content, course } = req.body;

    const post = await Post.create({
      content,
      course,
      author: req.user.id,
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ GET POSTS
//
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ LIKE / UNLIKE
//
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const userId = req.user.id;

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      message: alreadyLiked ? "Unliked" : "Liked",
      post,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ UPDATE POST
//
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    post.content = req.body.content || post.content;

    await post.save();

    res.json({
      message: "Post updated successfully",
      post,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

//
// ✅ DELETE POST
//
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await post.deleteOne();

    res.json({
      message: "Post deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
