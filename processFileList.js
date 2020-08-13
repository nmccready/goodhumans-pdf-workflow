'use strict';

// Require Logic
const
      lib    = require('./lib')
    , dotenv = require('dotenv')


module.exports.handler = function(event, context) {

    lib.getFileList(event, function(error, response) {
        return context.succeed(
            lib.lambdaProxyResponse(200, response)
        );
    });


};
