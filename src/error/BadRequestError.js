class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = "BadRequestError";
        Error.captureStackTrace(this, BadRequestError);
    }
}

module.exports = { BadRequestError };
