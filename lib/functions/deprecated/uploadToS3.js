const
    AWS = require('aws-sdk')

AWS.config.setPromisesDependency(null);

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
function uploadToS3(config) {
  const bucket = config.bucket;
  const prefix = config.prefix;

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
      ACL: 'public-read'
    };
    const uploadResponse = await s3.upload(params).promise();
    return uploadResponse['Location'];
  };
}

module.exports = uploadToS3;
