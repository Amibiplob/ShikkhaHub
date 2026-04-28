const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { register, login, getMe } = require("../controllers/authController");

// auth routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);

// logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

module.exports = router;
