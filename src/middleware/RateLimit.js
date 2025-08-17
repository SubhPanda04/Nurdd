const rateLimit = require('express-rate-limit');

const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs, 
        max,
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

const analysisRateLimit = createRateLimit(10 * 60 * 1000, 5); // Reduced to 5 requests per 10 minutes
const generalRateLimit = createRateLimit(15 * 60 * 1000, 50); // Reduced to 50 requests per 15 minutes

const requestTimeout = (timeout = 30000) => {
    return (req, res, next) => {
        req.setTimeout(timeout, () => {
            const err = new Error('Request Timeout');
            err.statusCode = 408;
            next(err);
        });
        next();
    };
};

module.exports = {
    analysisRateLimit,
    generalRateLimit,
    requestTimeout
};
