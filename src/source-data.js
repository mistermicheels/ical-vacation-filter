const axios = require("axios").default;

const { BadRequestError } = require("./error/BadRequestError");

const SOURCE_TIMEOUT_SECONDS = 60;
const SOURCE_TIMEOUT_MILLISECONDS = SOURCE_TIMEOUT_SECONDS * 1000;

/**
 * @param {any} sourceData
 * @param {import("axios").AxiosResponseHeaders} sourceHeaders
 * @param {string} sourceUrl
 */
const checkSourceIsIcalFeed = (sourceData, sourceHeaders, sourceUrl) => {
    const sourceContentType = sourceHeaders["content-type"];
    const isContentTypeCorrect = sourceContentType?.startsWith("text/calendar");

    const isSourceDataString = typeof sourceData === "string";
    const isDataIcalFormat = isSourceDataString && sourceData.startsWith("BEGIN:VCALENDAR");

    if (!isContentTypeCorrect || !isDataIcalFormat) {
        throw new BadRequestError(`Source URL ${sourceUrl} does not seem to return an iCal feed`);
    }
};

/**
 * @param {string} sourceUrl
 * @returns {Promise<{ sourceData: string, sourceHeaders: Record<string, any> }>}
 */
const getSourceDataAndHeaders = async (sourceUrl) => {
    /** @type {import("axios").AxiosRequestConfig} */
    const axiosOptions = { timeout: SOURCE_TIMEOUT_MILLISECONDS, responseType: "stream" };

    const sourceResponse = await axios.get(sourceUrl, axiosOptions).catch((error) => {
        if (error.code === "ECONNABORTED") {
            throw new BadRequestError(
                `URL ${sourceUrl} took more than ${SOURCE_TIMEOUT_SECONDS} seconds to respond`
            );
        } else {
            throw new BadRequestError(`Unable to get data from URL ${sourceUrl}`);
        }
    });

    const { data: sourceData, headers: sourceHeaders } = sourceResponse;
    checkSourceIsIcalFeed(sourceData, sourceHeaders, sourceUrl);
    return { sourceData, sourceHeaders };
};

module.exports = { getSourceDataAndHeaders };
