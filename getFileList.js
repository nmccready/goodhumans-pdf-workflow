'use strict';

const
      lib          = require('./lib')
    , dotenv       = require('dotenv')
    , formatDate   = require('./lib/functions/formatDate.js')
    , getFileList = require('./lib/functions/saveToBucket.js')

dotenv.config();


module.exports.handler = (event, context) => {
    lib.getLatestCursor(event, async (error, response) => {

        // const
        //       bucket    = process.env.S3_BUCKET_NAME
        //     // , storage   = uploadToS3({ bucket, prefix })
        //     // , uploadPDF = storePDF({ storage })

        return context.succeed(
            lib.lambdaProxyResponse(
                200,
                await getFileList(
                    JSON.stringify(response),
                    `${formatDate(false, true)}-cursor.json`,
                    'cursor'
                )
            )
        );
    });
};

