// import formatDate from "./formatDate";
// import uploadToS3 from "./uploadToS3";
// import storePDF from "./storePdf";
// import getFileBuffer from './getFileBuffer';

const
    formatDate      = require('./formatDate')
    , uploadToS3    = require('/uploadToS3')
    , storePDF      = require('./storePDF')
    , getFileBuffer = require('./getFileBuffer')


const downloadToS3 = async (url, filename) => {
    const
        bucket = process.env.s3BucketName
        , prefix = formatDate()
        , storage = uploadToS3({ bucket, prefix })
        , uploadPDF = storePDF({ storage })

    return await uploadPDF(
        await getFileBuffer(url),
        filename
    );
}

module.exports = downloadToS3;
