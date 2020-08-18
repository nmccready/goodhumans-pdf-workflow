'use strict';

const
    lib = require('./lib')
    , dotenv = require('dotenv')

dotenv.config();


module.exports.handler = function(event, context) {
    lib.mergePdfs(event, function(error, result) {
        if (error) {
            throw error;
        }

        return context.succeed(
            lib.lambdaProxyResponse(200, result)
        );

    });
};
