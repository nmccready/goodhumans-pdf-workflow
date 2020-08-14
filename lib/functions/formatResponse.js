/**
 * @typedef {Object} Response
 * @property {String} mergedPdf - The URL location of the PDF.
 */

/**
 * Formats the URL of the merged file into a JS Object.
 * @param {String} url - The URL of the merged PDF.
 * @returns {Response}
 */
function formatResponse(url) {
  console.log(`Stored at: ${url}`);

  return {
    mergedPdf: url
  }
}

module.exports = formatResponse;
