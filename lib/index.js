/**
 * Lib
 */

const
      dropboxV2Api     = require('dropbox-v2-api')
    , AWS              = require('aws-sdk')
    , dotenv           = require('dotenv')
    , path             = require('path')
    // , uploadToS3       = require('./functions/uploadToS3.js')
    // , storePDF         = require('./functions/storePdf.js')
    , formatDate       = require(path.resolve(__dirname, 'functions/formatDate.js'))
    // , downloadPdfsToS3 = require(path.resolve(__dirname, 'functions/downloadPdfsToS3.js')
    , saveToBucket     = require(path.resolve(__dirname, 'functions/saveToBucket.js'))
    , PDFMerge         = require('pdf-merge')
    , { PDFDocument }  = require('pdf-lib');


dotenv.config();

const FileTypes = Object.freeze({
    proofs  : '/LR/',
    artwork : '/HR/'
})

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
 * Get Dropbox object singleton.
 * @returns {Function}
 */
const getDropbox = () => {

    const Singleton = (() => {
        let instance;

        function createInstance() {
            return dropboxV2Api.authenticate({
                token : process.env['ACCESS_TOKEN']
            });
        }

        return {
            getInstance: () => {
                if (! instance) {
                    instance = createInstance();
                }
                return instance;
            }
        };
    })();

    return Singleton.getInstance();
}

/**
 * Get S3 object singleton.
 * @returns {S3}
 */
const getAwsS3 = () => {

    const Singleton = (function () {
        let instance;

        function createInstance() {
            return new AWS.S3();
        }

        return {
            getInstance: () => {
                if (! instance) {
                    instance = createInstance();
                }
                return instance;
            }
        };
    })();

    return Singleton.getInstance();
}

/**
 * Convert API result to object.
 * @param result
 * @param prop
 * @returns {any}
 */
const resultToJson = (result, prop) => {
    console.log(`@@@ RESULT ${prop} @@@`, result)
    return JSON.parse(result[prop].toString('utf-8'));
}

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getLatestCursor = (event, callback) => {

    const dropbox = getDropbox();

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

        saveToBucket(
            JSON.stringify(response),
            `${formatDate(false, true)}-cursor.json`,
            'cursor'
        )

        callback(null, JSON.stringify(response))
    });
};

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.saveCursorToBucket = (event, callback) => {

    var response = '\'saveCursorToBucket\' ran successfully!';

    return callback(null, response);
};

/**
 * Get latest Dropbox cursor
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getCursorFromBucket = (event, callback) => {

    const
        bucket   = process.env.S3_BUCKET_NAME
        , prefix   = 'cursor'
        , filename = `${formatDate(false, true)}-cursor.json`

    const s3 = getAwsS3();

    const params = {
        Bucket : bucket,
        Key    : `${prefix}/${filename}`
    }

    s3.getObject(params, (err, data) => {

        if (err) console.error(err);

        console.log('@@@ DATA @@@', data)

        // const cursor = resultToJson(data, 'Body').cursor;

        callback(null, resultToJson(data, 'Body'));
    });
};

/**
 * Get file list
 * @param event
 * @param callback
 * @returns {*}
 */
const getFileList = (event, callback) => {

    const
          bucket   = process.env.S3_BUCKET_NAME
        , prefix   = 'cursor'
        , filename = `${formatDate(false, true)}-cursor.json`

    const s3 = getAwsS3();

    const params = {
        Bucket: bucket,
        Key: `${prefix}/${filename}`
    }

    s3.getObject(params, (err, data) => {

        if (err) console.error(err);

        console.log('@@@ DATA @@@', data)

        const cursor = resultToJson(data, 'Body').cursor;

        let response;

        const dropbox = getDropbox();

        dropbox({
            resource: 'files/list_folder/continue',
            parameters: {
                cursor : cursor
            }
        }, (err, result, response) => {
            if (err) return console.log(err);

            console.log('@@@ ENTRIES @@@', result)

            let entries = result.entries;

            const downloadables = [];
            entries = entries.map((entry, i) => {
                if (! isDownloadable(entry)) return
                if (! isProofOrArtwork(entry)) return;
                downloadables.push(entry)
            });

            callback(null, downloadables)
        });
    });
};

module.exports.getFileList = getFileList;

/**
 * Merge list of PDFs from S3 bucket.
 * @param event
 * @param callback
 */
const mergePdfs = (event, callback) => {

}

module.exports.mergePdfs = mergePdfs;

const _getFileList = () => {
    return new Promise((resolve, reject) => {
        const
            bucket   = process.env.S3_BUCKET_NAME
            , prefix   = 'cursor'
            , filename = `${formatDate(false, true)}-cursor.json`

        const s3 = getAwsS3();

        const params = {
            Bucket: bucket,
            Key: `${prefix}/${filename}`
        }

        s3.getObject(params, (err, data) => {

            if (err) {
                console.error(err);
                reject(err);
            }

            console.log('@@@ CURSOR DATA @@@', data)

            const cursor = resultToJson(data, 'Body').cursor;

            console.log('@@@ CURSOR VALUE @@@', cursor)

            let response;

            const dropbox = getDropbox();

            dropbox({
                resource: 'files/list_folder/continue',
                parameters: {
                    cursor : cursor
                }
            }, (err, result, response) => {

                if (err) {
                    console.error(err);
                    reject(err);
                }

                try {
                    let entries = result.entries;

                    console.log('@@@ FILE LIST @@@', entries)

                    const downloadables = [];
                    entries = entries.map((entry, i) => {
                        if (! isDownloadable(entry)) return
                        if (! isProofOrArtwork(entry)) return;
                        downloadables.push(entry)
                        // if (i === entries.length - 1) { }
                    });

                    console.log('@@@ DOWNLOADABLES @@@', downloadables)

                    resolve(downloadables);
                }
                catch(e) { reject(e) }
            });
        });
    })
}

const downloadAllFiles = (downloadables) => {
    return new Promise((resolve, reject) => {
        try {
            let downloads = [];
            downloadables.forEach((file) => {
                downloads.push(doFileDownload(file))
            })
            resolve(downloads);
        }
        catch(e) { reject(e) }
    })
        .then((downloads) => {
            return downloads;
        })
}

/**
 * Merges a list of PDFs into a single PDF.
 * @param pdfs
 * @returns {Promise<Uint8Array>}
 */
const doMergePdfs = (downloads) => {
    return new Promise(async (resolve, reject) => {
        try {
            const
                merged = await PDFDocument.create()

            const s3 = getAwsS3();

            downloads.forEach((download, i) => {
                download.then((file) => {
                    console.log('### DOWNLOAD FILE ###', file)

                    const params = {
                        Bucket : file.Bucket,
                        Key    : file.Key
                    }

                    s3.getObject(params, (err, data) => {

                        if (err) reject(err);

                        console.log('### S3 OBJECT ###', data)

                        const addPage = async (buffer) => {
                            const
                                  pdf   = await PDFDocument.load(buffer)
                                , pages = await merged.copyPages(pdf, pdf.getPageIndices())

                            console.log('### PDF ###', pdf)

                            pages.forEach((page) => {
                                console.log('Add page to merged PDF')
                                merged.addPage(page);
                            });
                        }

                        return addPage(data.Body);
                    });
                })
            })

            // return await merged.save();
            resolve(await merged.save())
        }
        catch(e) { reject(e) }
    })
        .then((result) => {
            resolve(result);
        })
}

/**
 * Gets a promise to a file buffer from URL.
 * @param url
 * @returns {Promise<*>}
 */
const getFileBuffer = async (url) => {
    const res = await fetch(url, {
        redirect : 'follow',
        encoding : null
    })
    const buffer = await res.buffer();
    console.log('@@@ GET FILE BUFFER @@@', buffer)
    return buffer;
}

// .then((downloadables) => {
//
//     console.log( '[lib/index.js][downloadAndMergePdfs][_getFileList] downloadables', downloadables)
//
//     saveToBucket(
//         JSON.stringify(downloadables),
//         `${formatDate(true, true)}-filelist.json`,
//         formatDate(false, true)
//     )
//
//     return downloadables;
// })

/**
 * Get file list & merge results.
 * @param event
 * @param callback
 */
module.exports.downloadAndMergePdfs = (event, callback) => {

    _getFileList()
        .then(downloadAllFiles)
        .then((downloads) => {
            console.log('### DOWNLOADED FILES ###', downloads)
            Promise.all(downloads)
                .then((downloads) => {
                    doMergePdfs(downloads)
                        .then((result) => {
                            return result;
                        })
                })
        })
        .then((merged) => {
            console.log('### MERGED ###', merged)

            merged.then((result) => {
                const url = saveToBucket(
                    Buffer.from(result.buffer),
                    `${formatDate(false, true)}-merged.pdf`,
                    'merged'
                )

                return url;
            })
        })
        .then((url) => {
            callback(null, { url : url });
        })
        .catch((reason) => {
            throw new Error(reason);
        })
}

/**
 * Test if file is in Proofs & Final Artwork subfolder.
 * @param fileMeta
 * @returns {boolean}
 */
const isProofOrArtwork = (fileMeta) => {
    const filePath = fileMeta.path_display;
    if (filePath.indexOf(FileTypes.proofs) !== -1) return true;
    if (filePath.indexOf(FileTypes.artwork) !== -1) return true;
    return false;
}

/**
 * Test if the file is downloadable.
 * @param fileMeta
 * @returns {boolean|*}
 */
const isDownloadable = (fileMeta) => {
    if (typeof fileMeta.is_downloadable === 'undefined') return false;
    return fileMeta.is_downloadable;
}

/**
 * Download directly from Dropbox to S3.
 * @param fileMeta
 * @private
 */
const doFileDownload = (fileMeta) => {
    if (! isDownloadable(fileMeta)) {
        throw new Error( `${fileMeta.name} is not downloadable` )
    }

    const
        filePath  = fileMeta.path_display
        , dropbox = getDropbox()
        , s3      = getAwsS3()

    const stream = dropbox({
        resource: 'files/download',
        parameters: {
            'path': filePath
        }
    }, (err, result, response) => {});

    console.log('@@@ STREAM @@@', stream)

    let resolution = getSubfolderName(fileMeta);

    if (['HR', 'LR'].indexOf(resolution) === -1) {
        reject(`${fileMeta.path_display} is not a HR or LR file : ${resolution}`)
    }

    var params = {
        Bucket : process.env.S3_BUCKET_NAME,
        Key    : `${formatDate(false, true)}/${resolution}/${fileMeta.name}`,
        Body   : stream
    };

    s3.upload(params, (err, data) => {
        if (err) throw err;
        console.log('[index.js][doFileDownload][s3.upload]', data);
        return data;
    });
}

const getSubfolderName = (fileMeta) => {
    let resolution = 'UNKNOWN';
    if (fileMeta.path_display.indexOf(FileTypes.proofs) !== -1) {
        resolution = 'LR';
    }
    else if (fileMeta.path_display.indexOf(FileTypes.artwork) !== -1) {
        resolution = 'HR';
    }
    return resolution;
}

/**
 * Download Dropbox file
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.downloadFile = (event, callback) => {
    return callback(null, '\'downloadFile\' ran successfully!');
};

/**
 * Upload file to S3 Bucket
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.uploadFile = (event, callback) => {
    return callback(null, '\'uploadFile\' ran successfully!');
};

/**
 * Send SNS notification
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.sendNotification = (event, callback) => {
    return callback(null, '\'sendNotification\' ran successfully!');
};
