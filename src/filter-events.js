const stream = require("stream");

// capture line breaks so the result has same line break style as the source.
// iCal feed does not start with BEGIN:VEVENT, so there will be a line break before the first BEGIN:VEVENT
const EVENT_START_REGEX = /\r?\nBEGIN:VEVENT$/m;

// use positive lookbehind so the actual matched position is the end of END:VEVENT
const EVENT_END_REGEX = /(?<=^END:VEVENT$)/m;

const IS_EVENT_OUT_OF_OFFICE_REGEX = /^X-MICROSOFT-CDO-BUSYSTATUS:OOF$/m;

/**
 * @param {NodeJS.ReadableStream} sourceData
 */
async function* filterEventsAsyncGenerator(sourceData) {
    let dataToBeProcessed = "";

    // use async iterator syntax to iterate through the source stream
    for await (const chunk of sourceData) {
        dataToBeProcessed = dataToBeProcessed + chunk;

        while (dataToBeProcessed.search(EVENT_END_REGEX) >= 0) {
            const indexEventStart = dataToBeProcessed.search(EVENT_START_REGEX);
            const indexEventEnd = dataToBeProcessed.search(EVENT_END_REGEX);
            const fullEvent = dataToBeProcessed.substring(indexEventStart, indexEventEnd);

            // any data before the first event or between events needs to be kept
            const dataBeforeEvent = dataToBeProcessed.substring(0, indexEventStart);
            yield dataBeforeEvent;

            if (IS_EVENT_OUT_OF_OFFICE_REGEX.test(fullEvent)) {
                yield fullEvent;
            }

            dataToBeProcessed = dataToBeProcessed.substring(indexEventEnd);
        }
    }

    // any data after the last event needs to be kept
    yield dataToBeProcessed;
}

/**
 * @param {NodeJS.ReadableStream} sourceData
 * @returns {NodeJS.ReadableStream}
 */
const filterEvents = (sourceData) => {
    return stream.Readable.from(filterEventsAsyncGenerator(sourceData));
};

module.exports = { filterEvents };
