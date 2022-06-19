const FULL_EVENT_REGEX = /^BEGIN:VEVENT.*?^END:VEVENT\r?\n/gms;
const IS_EVENT_OUT_OF_OFFICE_REGEX = /^X-MICROSOFT-CDO-BUSYSTATUS:OOF$/gms;

/**
 * @param {string} sourceData
 * @returns {string}
 */
const filterEvents = (sourceData) => {
    return sourceData.replace(FULL_EVENT_REGEX, (event) =>
        IS_EVENT_OUT_OF_OFFICE_REGEX.test(event) ? event : ""
    );
};

module.exports = { filterEvents };
