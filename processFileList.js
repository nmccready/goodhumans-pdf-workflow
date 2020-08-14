'use strict';

const
      lib    = require('./lib')
    , dotenv = require('dotenv')

dotenv.config();


module.exports.handler = function(event, context) {
    lib.getFileList(event, function(error, response) {
        return context.succeed(
            lib.lambdaProxyResponse(200, response)
        );
    });
};
