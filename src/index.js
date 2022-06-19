const axios = require("axios").default;
const express = require("express");

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

/**
 * @param {(req: express.Request, res: express.Response) => Promise<void>} callback
 * @returns {express.RequestHandler}
 */
const asyncWrap = (callback) => (req, res, next) => callback(req, res).catch(next);

app.get(
    "/filter",
    asyncWrap(async (req, res) => {
        const sourceUrl = req.query.source;
        const sourceResponse = await axios.get(sourceUrl);

        /** @type {string} */
        const sourceData = sourceResponse.data;

        const fullEventRegex = /^BEGIN:VEVENT.*?^END:VEVENT\r?\n/gms;
        const isEventOutOfOfficeRegex = /^X-MICROSOFT-CDO-BUSYSTATUS:OOF$/gms;

        const filteredData = sourceData.replace(fullEventRegex, (event) =>
            isEventOutOfOfficeRegex.test(event) ? event : ""
        );

        res.header(sourceResponse.headers);
        res.send(filteredData);
    })
);

app.listen(port, () => {
    console.log(`Running on port ${port}`);
});
