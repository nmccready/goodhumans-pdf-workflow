const
    downloadToS3 = require('./downloadToS3')

/**
 * Downloads PDF from a URL into S3 bucket.
 * @param urls
 * @returns {Promise<[]>}
 */
const downloadPdfsToS3 = async (urls) => {

    const pdfs = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const
            file = decodeURI(url)
                .split('/')
                .pop()
                .split(' ')
                .join('-')
                .replace('?dl=1', '')

        pdfs.push(await downloadToS3(url, file))
    }

    return pdfs;
}

module.exports = downloadPdfsToS3;
