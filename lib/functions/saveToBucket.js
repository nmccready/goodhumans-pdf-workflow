const
      dotenv     = require('dotenv')
    , uploadToS3 = require('./uploadToS3.js')
    , AWS = require('aws-sdk')

dotenv.config();
AWS.config.setPromisesDependency(null);


const
    uuid = require('node-uuid')
    , formatDate = require('./formatDate.js')

/**
 * Uploads a file to an S3 bucket.
 * @param {Object} config
 * @param {String} config.bucket - The S3 bucket name
 * @param {String} config.prefix - The S3 folder name
 * @returns {uploadToS3~send} - Function that uploads the merged PDF to S3
 *   and returns the location URL.
 * @example
 * const storage = uploadToS3({ bucket: 'test-bucket', prefix: 'merged' });
 * uploadToS3("foo.pdf", "<file contents>");
 */
const getStorage = (config) => {
    const
          bucket = config.bucket
        , prefix = config.prefix
        , access = config.access

    /**
     * @name uploadToS3~send
     * @param {String} key - The filepath to where the file will be uploaded.
     * @param {Buffer} buffer - The contents of the file.
     * @returns {String} - The URL of the uploaded file.
     */
    return async function send(key, buffer) {
        const s3 = new AWS.S3();
        const params = {
            Bucket: bucket,
            Key: `${prefix}/${key}`,
            Body: buffer,
            ACL: 'private'
        };
        const uploadResponse = await s3.upload(params).promise();
        return uploadResponse['Location'];
    };
}

/**
 * Sends request to upload a PDF using the provided storage method.
 * @param {Object} config
 * @param {Function} config.storage - The function that will upload the PDF.
 * @returns {storePdf~send} - Function which stores the contents of a buffer
 *   and returns the URL of the stored file.
 * @example
 * const storage = (filepath, buffer) => #...;
 * const uploadPDF = storePDF({ storage });
 * uploadPDF("<file contents>");
 */
const sendToStorage = (config) => {
    const storage = config.storage;

    /**
     * @name store~send
     * @param {Buffer} buffer - The buffer of the PDF.
     * @returns {String} - The URL of the stored PDF.
     */
    return async function send(buffer, _filepath) {
        return await storage( _filepath, buffer );
    }
}

/**
 * Save buffer to S3 Bucket
 * @param subdir
 * @param filename
 * @param content
 * @returns {Promise<*>}
 */
const saveToBucket = async ( content, filename, prefix ) => {

    prefix = prefix || '';

    const
          bucket    = process.env.S3_BUCKET_NAME
        , storage   = getStorage({ bucket, prefix })
        , saveFile  = sendToStorage({ storage })

    if (typeof content !== 'string') {
        throw new Error('Content for saveToBucket *must* be a string');
    }

    return await saveFile(
        Buffer.from(content),
        filename
    )
}

module.exports = saveToBucket;
