const logger = require('../utils/logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    logger.error(`Error ${err.statusCode || 500}: ${err.message}`);

    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new AppError(message, 404);
    }
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 400);
    }
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new AppError(message, 400);
    }
    if (err.code === 'PGRST116') {
        error = new AppError('Resource not found', 404);
    }
    if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        error = new AppError('Request timeout - please try again', 408);
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        error = new AppError('Unable to connect to the website', 422);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

const notFound = (req, res, next) => {
    const error = new AppError(`Not found - ${req.originalUrl}`, 404);
    next(error);
};

module.exports = {
    AppError,
    asyncHandler,
    errorHandler,
    notFound
};
