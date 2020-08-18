'use strict';

const
      lib    = require('./lib')
    , dotenv = require('dotenv')

dotenv.config();


module.exports.handler = function(event, context) {
    lib.downloadAndMergePdfs(event, function(error, result) {

        console.log( '[processFileList.js][getFileList]', {
            error    : error,
            result : result
        })

        if (error) {
            throw error;
        }

        return context.succeed(
            lib.lambdaProxyResponse(200, result)
        );

    });
};
