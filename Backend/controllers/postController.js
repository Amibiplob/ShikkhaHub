const Post = require("../models/Post");

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { content, course } = req.body;

    const post = new Post({
      content,
      course,
      author: req.user.id,
    });

    await post.save();

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// GET POSTS
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// LIKE / UNLIKE
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    const userId = req.user.id;

    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
// UPDATE POST
exports.updatePost = async (req, res) => {
  try {
    const Post = require("../models/Post");
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    post.content = req.body.content || post.content;

    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const Post = require("../models/Post");
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await post.deleteOne();

    res.json({ msg: "Post deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};