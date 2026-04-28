const User = require("../models/User");
const bcrypt = require("bcryptjs");

//
// ✅ UPDATE PROFILE
//
exports.updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name) {
      user.name = name.trim();
    }

    if (password && password.trim().length >= 6) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Server error",
    });
  }
};
