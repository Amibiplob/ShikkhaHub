const { body } = require("express-validator");

//
// ✅ REGISTER VALIDATION
//
exports.registerValidator = [
  body("name").notEmpty().withMessage("Name is required"),

  body("email").isEmail().withMessage("Valid email is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

//
// ✅ LOGIN VALIDATION
//
exports.loginValidator = [
  body("email").isEmail().withMessage("Valid email is required"),

  body("password").notEmpty().withMessage("Password is required"),
];
