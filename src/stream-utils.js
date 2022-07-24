const stream = require("stream");

/**
 * @param {stream.Readable} inputStream
 * @returns {Promise<{ firstChunk: string | Buffer, reconstructedFullStream: stream.Readable }>}
 */
const inspectFirstChunk = async (inputStream) => {
    const internalFullStream = new stream.PassThrough();
    const reconstructedFullStream = new stream.PassThrough();
    inputStream.pipe(internalFullStream);
    inputStream.pipe(reconstructedFullStream);

    reconstructedFullStream.on("close", () => {
        inputStream.destroy();
    });

    for await (const chunk of internalFullStream) {
        inputStream.unpipe(internalFullStream);
        internalFullStream.destroy();
        return { firstChunk: chunk, reconstructedFullStream };
    }
};

module.exports = { inspectFirstChunk };
