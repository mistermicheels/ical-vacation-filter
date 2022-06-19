const express = require("express");

const { BadRequestError } = require("./error/BadRequestError");

const { getSourceDataAndHeaders } = require("./source-data");
const { filterEvents } = require("./filter-events");

const app = express();
app.set("view engine", "pug");

/**
 * @param {(req: express.Request, res: express.Response) => Promise<void>} callback
 * @returns {express.RequestHandler}
 */
const asyncWrap = (callback) => (req, res, next) => callback(req, res).catch(next);

app.get(
    "/filter",
    asyncWrap(async (req, res) => {
        const sourceUrl = req.query.source;

        if (!sourceUrl || typeof sourceUrl !== "string") {
            throw new BadRequestError("Source URL mut be provided as 'source' query parameter");
        }

        const { sourceData, sourceHeaders } = await getSourceDataAndHeaders(sourceUrl);
        const filteredData = filterEvents(sourceData);
        res.header(sourceHeaders);
        res.send(filteredData);
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
