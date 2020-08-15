'use strict';

const
      lib          = require('./lib')
    , dotenv       = require('dotenv')
    , formatDate   = require('./lib/functions/formatDate.js')
    , saveToBucket = require('./lib/functions/saveToBucket.js')

dotenv.config();


module.exports.handler = (event, context) => {
    lib.getLatestCursor(event, (error, response) => {
        return context.succeed(
            lib.lambdaProxyResponse(
                200,
                response
            )
        );
    });
};
