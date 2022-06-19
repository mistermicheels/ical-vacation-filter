const express = require("express");

const { BadRequestError } = require("./error/BadRequestError");

const { getSourceDataAndHeaders } = require("./source-data");
const { filterEvents } = require("./filter-events");

const app = express();
app.set("view engine", "pug");

/**
 * @param {(req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>} callback
 * @returns {express.RequestHandler}
 */
const asyncWrap = (callback) => (req, res, next) => callback(req, res, next).catch(next);

app.get(
    "/filter",
    asyncWrap(async (req, res, next) => {
        const sourceUrl = req.query.source;

        if (!sourceUrl || typeof sourceUrl !== "string") {
            throw new BadRequestError("Source URL must be provided as 'source' query parameter");
        }

        const { sourceData, sourceHeaders } = await getSourceDataAndHeaders(sourceUrl);
        const filteredData = filterEvents(sourceData);

        filteredData.on("error", (err) => {
            return next(err);
        });

        res.header(sourceHeaders);
        filteredData.pipe(res);
    })
);

app.use((err, _req, res, next) => {
    if (res.headersSent || !(err instanceof BadRequestError)) {
        // delegate to default error handler
        return next(err);
    }

    res.status(400);
    res.render("error", { message: err.message });
});

module.exports = { app };
