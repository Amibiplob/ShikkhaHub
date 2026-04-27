const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.json({ msg: "Profile updated" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
