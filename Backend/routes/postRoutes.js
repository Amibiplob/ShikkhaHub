const express = require("express");
const router = express.Router();

const postController = require("../controllers/postController");
const auth = require("../middleware/authMiddleware");

//
// ✅ PUBLIC ROUTES
//
router.get("/", postController.getPosts);

//
// ✅ PROTECTED ROUTES
//
router.post("/", auth, postController.createPost);
router.post("/:id/like", auth, postController.toggleLike);
router.put("/:id", auth, postController.updatePost);
router.delete("/:id", auth, postController.deletePost);

module.exports = router;
