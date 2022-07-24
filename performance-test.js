const autocannon = require("autocannon");
const commander = require("commander");
const crypto = require("crypto");
const http = require("http");
const ics = require("ics");

/** @type {typeof import("random-words").default} */
// @ts-ignore (it seems the included type definitions for random-words don't play nice with JS as is)
const randomWords = require("random-words");

const MOCK_SOURCE_SERVER_PORT = 8080;

const NUMBER_ICAL_EVENTS = 500;
const BINARY_DATA_SIZE = 1024 * 1024;

const supportedScenarios = [
    stringLiteral("icalData"),
    stringLiteral("binaryData"),
    stringLiteral("binaryDataWithIcalHeader"),
];

commander.program
    .addOption(
        new commander.Option("-s, --scenario <scenario>", "the scenario to simulate")
            .makeOptionMandatory()
            .choices(supportedScenarios)
    )
    .addOption(
        new commander.Option(
            "-m, --mock-only",
            "expose mock calendar source server without performing load testing"
        )
    );

commander.program.parse();

/** @type {{scenario: string, mockOnly: boolean }} */
const parsedArguments = commander.program.opts();

const mockIcalData = getMockIcalData();
const mockBinaryData = getMockBinaryData();

/** @typedef {typeof supportedScenarios[number]} SupportedScenario */

/** @type {{ [scenario in SupportedScenario]: http.RequestListener }} */
const mockSourceServerRequestListeners = {
    icalData: (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/calendar" });
        res.end(mockIcalData);
    },
    binaryData: (_req, res) => {
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(mockBinaryData);
    },
    binaryDataWithIcalHeader: (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/calendar" });
        res.end(mockBinaryData);
    },
};

runTest();

async function runTest() {
    const requestListener = mockSourceServerRequestListeners[parsedArguments.scenario];
    const mockSourceServer = http.createServer(requestListener);
    console.log(`Starting mock source server on port ${MOCK_SOURCE_SERVER_PORT}`);
    mockSourceServer.listen(MOCK_SOURCE_SERVER_PORT);

    if (!parsedArguments.mockOnly) {
        const mockSourceServerUrl = `http://localhost:${MOCK_SOURCE_SERVER_PORT}`;
        const urlToTest = `http://localhost:3000/filter?source=${mockSourceServerUrl}`;

        console.log("Load testing using autocannon");

        const autocannonResult = await autocannon({
            url: urlToTest,
            connections: 10,
            duration: 10,
        });

        const numberRequests = autocannonResult.latency.totalCount;
        const minLatency = autocannonResult.latency.min;
        const maxLatency = autocannonResult.latency.max;

        console.log(`Completed ${numberRequests} requests using 10 connections during 10 seconds`);
        console.log(`Minimum latency: ${minLatency}`);
        console.log(`Maximum latency: ${maxLatency}`);

        console.log("Shutting down mock source server");
        mockSourceServer.close();
    }
}

function getMockIcalData() {
    const nextEventDate = new Date();

    /** @type {ics.EventAttributes[]} */
    const events = [];

    for (let i = 0; i < NUMBER_ICAL_EVENTS; i++) {
        events.push({
            start: [
                nextEventDate.getFullYear(),
                nextEventDate.getMonth() + 1,
                nextEventDate.getDate(),
                Math.floor(Math.random() * 24),
                Math.floor(Math.random() * 60),
            ],
            duration: { hours: Math.floor(Math.random() * 2) + 1 },
            title: randomWords({ min: 1, max: 5, join: " " }),
            description: randomWords({ min: 1, max: 100, join: " " }),
            location: randomWords({ min: 1, max: 10, join: " " }),
            status: Math.random() < 0.8 ? "CONFIRMED" : "TENTATIVE",
            busyStatus: Math.random() < 0.95 ? "BUSY" : "OOF",
        });

        nextEventDate.setDate(nextEventDate.getDate() + 1);
    }

    return ics.createEvents(events).value;
}

function getMockBinaryData() {
    // using crypto is overkill, but it's an easy way to get random bytes
    return crypto.randomBytes(BINARY_DATA_SIZE);
}

/**
 * Utility function to make TypeScript infer a string's type as a specific string literal.
 * This is basically a JS alternative to "as const".
 * @template {string} T
 * @param {T} string
 * @returns T
 */
function stringLiteral(string) {
    return string;
}
