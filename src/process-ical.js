const stream = require("stream");

const { BadRequestError } = require("./error/BadRequestError");

const EXPECTED_CALENDAR_START_TEXT = "BEGIN:VCALENDAR";

// capture line breaks so the result has same line break style as the source.
// iCal feed does not start with BEGIN:VEVENT, so there will be a line break before the first BEGIN:VEVENT
const EVENT_START_REGEX = /\r?\nBEGIN:VEVENT$/m;

const EVENT_END_REGEX = /^END:VEVENT$/m;
const EVENT_END_TEXT = "END:VEVENT";

const IS_EVENT_OUT_OF_OFFICE_REGEX = /^X-MICROSOFT-CDO-BUSYSTATUS:OOF$/m;

const MAX_NUMBER_EVENTS_PROCESSED_SYNCHRONOUSLY = 50;

/**
 * @param {string | Buffer} chunk
 */
const checkIcalDataStart = (chunk) => {
    if (!chunk.toString().startsWith(EXPECTED_CALENDAR_START_TEXT)) {
        throw new BadRequestError("Invalid start of iCal data");
    }
};

/**
 * @param {string} unprocessedReceivedData
 * @returns {{ eventData: string, dataBeforeEvent: string, dataAfterEvent: string }}
 */
const getNextCompleteEvent = (unprocessedReceivedData) => {
    const indexNextEventEnd = unprocessedReceivedData.search(EVENT_END_REGEX);

    if (indexNextEventEnd < 0) {
        // data contains either no event or only a partial event
        return undefined;
    }

    // we only process complete events, so we can assume there is an event start before the event end
    const startIndex = unprocessedReceivedData.search(EVENT_START_REGEX);
    const endIndex = indexNextEventEnd + EVENT_END_TEXT.length;
    const eventData = unprocessedReceivedData.substring(startIndex, endIndex);
    const dataBeforeEvent = unprocessedReceivedData.substring(0, startIndex);
    const dataAfterEvent = unprocessedReceivedData.substring(endIndex);
    return { eventData, dataBeforeEvent, dataAfterEvent };
};

/**
 * @param {string} eventData
 * @returns {boolean}
 */
const isOutOfOfficeEvent = (eventData) => IS_EVENT_OUT_OF_OFFICE_REGEX.test(eventData);

/**
 * @param {NodeJS.ReadableStream} sourceData
 */
async function* filterEventsAsyncGenerator(sourceData) {
    let unprocessedReceivedData = "";

    // use async iterator syntax to iterate through the source stream
    for await (const chunk of sourceData) {
        unprocessedReceivedData = unprocessedReceivedData + chunk;

        let processedEventsCurrentChunk = 0;
        let nextCompleteEvent = getNextCompleteEvent(unprocessedReceivedData);

        while (nextCompleteEvent) {
            const { eventData, dataBeforeEvent, dataAfterEvent } = nextCompleteEvent;

            // any data before the first event or between events needs to be kept
            yield dataBeforeEvent;

            if (isOutOfOfficeEvent(eventData)) {
                yield eventData;
            }

            unprocessedReceivedData = dataAfterEvent;
            processedEventsCurrentChunk++;

            if (processedEventsCurrentChunk % MAX_NUMBER_EVENTS_PROCESSED_SYNCHRONOUSLY === 0) {
                // break up the processing of longer chunks so we don't block the event loop for too long
                await new Promise((resolve) => setTimeout(resolve));
            }

            nextCompleteEvent = getNextCompleteEvent(unprocessedReceivedData);
        }
    }

    // any data after the last event needs to be kept
    yield unprocessedReceivedData;
}

/**
 * @param {NodeJS.ReadableStream} sourceData
 * @returns {NodeJS.ReadableStream}
 */
const filterEvents = (sourceData) => {
    return stream.Readable.from(filterEventsAsyncGenerator(sourceData));
};

module.exports = { checkIcalDataStart, filterEvents };
