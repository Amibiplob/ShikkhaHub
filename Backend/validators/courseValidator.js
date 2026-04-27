const { body } = require("express-validator");

exports.createCourseValidator = [
  body("title").notEmpty().withMessage("Title required"),
  body("price").isNumeric().withMessage("Price must be number"),
];
