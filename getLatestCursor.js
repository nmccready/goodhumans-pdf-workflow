'use strict';

const
      lib    = require('./lib')
    , dotenv     = require('dotenv')
    // , uploadToS3 = require('./lib/functions/uploadToS3.js')
    // , storePDF   = require('./lib/functions/storePdf.js')
    , formatDate = require('./lib/functions/formatDate.js')
    , saveToBucket = require('./lib/functions/saveToBucket.js')

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
                await saveToBucket(
                    JSON.stringify(response),
                    `${formatDate(false, true)}-cursor.json`,
                    'cursor'
                )
            )
        );
    });
};
