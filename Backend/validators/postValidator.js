const { body } = require("express-validator");

exports.postValidator = [
  body("content")
    .notEmpty()
    .withMessage("Post cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Max 500 chars"),
];
