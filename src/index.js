const axios = require("axios").default;
const express = require("express");

const app = express();
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
    const sourceResponse = await axios.get(sourceUrl);
    return { sourceData: sourceResponse.data, sourceHeaders: sourceResponse.headers };
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
        const { sourceData, sourceHeaders } = await getSourceDataAndHeaders(sourceUrl);
        const filteredData = filterEvents(sourceData);
        res.header(sourceHeaders);
        res.send(filteredData);
    })
);

app.listen(port, () => {
    console.log(`Running on port ${port}`);
});
