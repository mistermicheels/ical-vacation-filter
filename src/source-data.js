const axios = require("axios").default;

const { BadRequestError } = require("./error/BadRequestError");

const SOURCE_TIMEOUT_SECONDS = 60;
const SOURCE_TIMEOUT_MILLISECONDS = SOURCE_TIMEOUT_SECONDS * 1000;

/**
 * @param {import("axios").AxiosResponseHeaders} sourceHeaders
 */
const isSourceIcalFeed = (sourceHeaders) => {
    const sourceContentType = sourceHeaders["content-type"];
    return sourceContentType?.startsWith("text/calendar");
};

/**
 * @param {string} sourceUrl
 * @returns {Promise<{ sourceData: NodeJS.ReadableStream, sourceHeaders: Record<string, any> }>}
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

    if (!isSourceIcalFeed(sourceHeaders)) {
        sourceData.destroy();
        throw new BadRequestError(`Source URL ${sourceUrl} does not seem to return an iCal feed`);
    }

    return { sourceData, sourceHeaders };
};

module.exports = { getSourceDataAndHeaders };
