/**
 * Lib
 */

const
    dropboxV2Api = require('dropbox-v2-api')
    , dotenv     = require('dotenv')
    , uploadToS3 = require('./functions/uploadToS3.js')
    , storePDF   = require('./functions/storePdf.js')


dotenv.config();


/**
 * Single - All
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.singleAll = (event, callback) => {
  var response = 'Your Serverless function ran successfully via the \''
    + event.httpMethod
    + '\' method!';

  return callback(null, response);
};

/**
 * Multi - Create
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.multiCreate = (event, callback) => {
  var response = 'Your Serverless function \'multi/create\' ran successfully!';

  return callback(null, response);
};

/**
 * Multi - Show
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.multiShow = (event, callback) => {
  var response = 'Your Serverless function \'multi/show\' ran successfully with the following ID \'' + event.pathParameters.id + '\'!';

  return callback(null, response);
};

/**
 * AWS Lambda Proxy Response
 * @param code
 * @param body
 * @returns {{body: string, statusCode: *}}
 */
module.exports.lambdaProxyResponse = (code, body) => {
  const response = {
    statusCode: code,
    body: JSON.stringify(body),
  };

  return response;
};

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getLatestCursor = (event, callback) => {

    // const
    //       bucket    = process.env.S3_BUCKET_NAME
    //     , prefix    = 'cursor'
    //     , storage   = uploadToS3({ bucket, prefix })
    //     , uploadPDF = storePDF({ storage })

    let response = 'getLatestCursor : Default response';

    const dropbox = dropboxV2Api.authenticate({
        token : process.env['ACCESS_TOKEN']
    });

    dropbox({
        resource: 'files/list_folder/get_latest_cursor',
        parameters: {
            path                           : '/pdf-merge/staging',
            recursive                      : true,
            include_deleted                : false,
            include_non_downloadable_files : false,
            include_media_info             : false
        }
    }, (err, result, response) => {
        if (err) { return console.log(err); }
        // console.log(result);
        callback(null, result)
    });

    // return callback(null, response);
};

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.saveCursorToBucket = (event, callback) => {

    var response = 'Your Serverless function \'saveCursorToBucket\' ran successfully!';

    return callback(null, response);
};

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getCursorFromBucket = (event, callback) => {

    var response = 'Your Serverless function \'getCursorFromBucket\' ran successfully!';

    return callback(null, response);
};

/**
 * Get file list
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getFileList = (event, callback) => {
    var response = 'Your Serverless function \'getFileList\' ran successfully!';

    return callback(null, response);
};

/**
 * Get Dropbox download link
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getDownloadLink = (event, callback) => {
    var response = 'Your Serverless function \'getDownloadLink\' ran successfully!';

    return callback(null, response);
};

/**
 * Download Dropbox file
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.downloadFile = (event, callback) => {
    var response = 'Your Serverless function \'downloadFile\' ran successfully!';

    return callback(null, response);
};

/**
 * Upload file to S3 Bucket
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.uploadFile = (event, callback) => {
    var response = 'Your Serverless function \'uploadFile\' ran successfully!';

    return callback(null, response);
};

/**
 * Send SNS notification
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.sendNotification = (event, callback) => {
    var response = 'Your Serverless function \'sendNotification\' ran successfully!';

    return callback(null, response);
};
