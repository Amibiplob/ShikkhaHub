const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const auth = require("../middleware/authMiddleware");

//
// ✅ USER ROUTES
//
router.put("/me", auth, userController.updateProfile);

module.exports = router;
