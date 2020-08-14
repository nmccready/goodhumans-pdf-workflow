const
    request = require('request-promise')

/**
 * Sends request to download file from URL.
 * @param {String} url - The URL of the PDF to download.
 * @returns {Promise} - Promise to download PDF.
 */
async function download(url) {
  const requestSettings = {
    method: 'GET',
    url: url,
    encoding: null
  };

  return await request(requestSettings);
}

module.exports = download;
