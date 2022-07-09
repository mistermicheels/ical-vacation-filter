const stream = require("stream");

/**
 * @param {NodeJS.ReadableStream} inputStream
 * @returns {Promise<{ firstChunk: string | Buffer, reconstructedFullStream: NodeJS.ReadableStream }>}
 */
const inspectFirstChunk = async (inputStream) => {
    const reconstructedFullStream = new stream.PassThrough();
    const internalFullStream = new stream.PassThrough();
    inputStream.pipe(reconstructedFullStream);
    inputStream.pipe(internalFullStream);

    for await (const chunk of internalFullStream) {
        inputStream.unpipe(internalFullStream);
        internalFullStream.destroy();
        return { firstChunk: chunk, reconstructedFullStream };
    }
};

module.exports = { inspectFirstChunk };
