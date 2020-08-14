/**
 * @typedef {Object} Response
 * @property {String} mergedPdf - The URL location of the PDF.
 */

/**
 * Formats the URL of the merged file into a JS Object.
 * @param {String} url - The URL of the merged PDF.
 * @returns {Response}
 */
function formatUploadResponse(urls) {
    console.log(`Stored at: ${urls}`);

    return {
        uploads: urls
    }
}

module.exports = formatUploadResponse;
