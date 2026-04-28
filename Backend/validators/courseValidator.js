const { body } = require("express-validator");

//
// ✅ CREATE COURSE VALIDATION
//
exports.createCourseValidator = [
  body("title").notEmpty().withMessage("Title is required"),

  body("price").isNumeric().withMessage("Price must be a valid number"),
];
