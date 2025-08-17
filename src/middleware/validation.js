const { body, param, validationResult } = require('express-validator');

const validateUrl = [
    body('url')
        .notEmpty()
        .withMessage('URL is required')
        .isURL({
            protocols: ['http', 'https'],
            require_protocol: true
        })
        .withMessage('Valid HTTP/HTTPS URL is required')
        .isLength({ max: 500 })
        .withMessage('URL must be less than 500 characters'),
];

const validateId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid positive integer ID is required'),
];
const validateUpdateFields = [
    body('brand_name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Brand name must be less than 255 characters')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters')
        .trim(),
    body('enhanced_description')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Enhanced description must be less than 2000 characters')
        .trim(),
];

const checkValidationResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

module.exports = {
    validateUrl,
    validateId,
    validateUpdateFields,
    checkValidationResult
};
