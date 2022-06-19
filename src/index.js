const axios = require("axios").default;
const express = require("express");

const BadRequestError = require("./BadRequestError");

const app = express();
app.set("view engine", "pug");

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * @param {(req: express.Request, res: express.Response) => Promise<void>} callback
 * @returns {express.RequestHandler}
 */
const asyncWrap = (callback) => (req, res, next) => callback(req, res).catch(next);

/**
 * @param {string} sourceUrl
 * @returns {Promise<{ sourceData: string, sourceHeaders: Record<string, any> }>}
 */
const getSourceDataAndHeaders = async (sourceUrl) => {
    const sourceResponse = await axios.get(sourceUrl).catch(() => {
        throw new BadRequestError(`Unable to get data from URL ${sourceUrl}`);
    });

    const sourceHeaders = sourceResponse.headers;
    const sourceData = sourceResponse.data;

    const sourceContentType = sourceHeaders["content-type"];
    const isContentTypeCorrect = sourceContentType?.startsWith("text/calendar");

    const isSourceDataString = typeof sourceData === "string";
    const isDataIcalFormat = isSourceDataString && sourceData.startsWith("BEGIN:VCALENDAR");

    if (!isContentTypeCorrect || !isDataIcalFormat) {
        throw new BadRequestError(`Source URL ${sourceUrl} does not seem to return an iCal feed`);
    }

    return { sourceData, sourceHeaders };
};

/**
 * @param {string} sourceData
 * @returns {string}
 */
const filterEvents = (sourceData) => {
    const fullEventRegex = /^BEGIN:VEVENT.*?^END:VEVENT\r?\n/gms;
    const isEventOutOfOfficeRegex = /^X-MICROSOFT-CDO-BUSYSTATUS:OOF$/gms;

    return sourceData.replace(fullEventRegex, (event) =>
        isEventOutOfOfficeRegex.test(event) ? event : ""
    );
};

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

app.listen(port, () => {
    console.log(`Running on port ${port}`);
});
