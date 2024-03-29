const express = require("express");

const { BadRequestError } = require("./error/BadRequestError");

const { getSourceDataAndHeaders } = require("./source-data");
const { inspectFirstChunk } = require("./stream-utils");
const { checkIcalDataStart, filterEvents } = require("./process-ical");

const app = express();

const NOT_FORWARDED_HEADERS = ["connection", "content-length", "transfer-encoding"];

/**
 * @param {(req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>} callback
 * @returns {express.RequestHandler}
 */
const asyncWrap = (callback) => (req, res, next) => callback(req, res, next).catch(next);

/**
 * @param {Record<string, any>} sourceHeaders
 * @returns {Record<string, any>}
 */
const getHeadersToForward = (sourceHeaders) => {
    const newHeaders = {};

    for (const headerName in sourceHeaders) {
        if (!NOT_FORWARDED_HEADERS.includes(headerName)) {
            newHeaders[headerName] = sourceHeaders[headerName];
        }
    }

    return newHeaders;
};

app.get(
    "/filter",
    asyncWrap(async (req, res, next) => {
        const sourceUrl = req.query.source;

        if (!sourceUrl || typeof sourceUrl !== "string") {
            throw new BadRequestError("Source URL must be provided as 'source' query parameter");
        }

        const { sourceData, sourceHeaders } = await getSourceDataAndHeaders(sourceUrl);
        const { firstChunk, reconstructedFullStream } = await inspectFirstChunk(sourceData);

        try {
            checkIcalDataStart(firstChunk);
        } catch (error) {
            reconstructedFullStream.destroy();
            throw error;
        }

        const filteredData = filterEvents(reconstructedFullStream);

        filteredData.on("error", (err) => {
            reconstructedFullStream.destroy();
            return next(err);
        });

        res.header(getHeadersToForward(sourceHeaders));
        filteredData.pipe(res);
    })
);

app.use((err, _req, res, next) => {
    if (res.headersSent || !(err instanceof BadRequestError)) {
        // delegate to default error handler
        return next(err);
    }

    res.status(400);
    res.json({ title: "Error", message: err.message });
});

module.exports = { app };
