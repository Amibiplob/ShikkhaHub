const { body } = require("express-validator");

//
// ✅ POST VALIDATION
//
exports.postValidator = [
  body("content")
    .notEmpty()
    .withMessage("Post content cannot be empty")

    .isLength({ max: 500 })
    .withMessage("Post cannot exceed 500 characters"),
];
