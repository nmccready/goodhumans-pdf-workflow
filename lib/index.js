/**
 * Lib
 */

const
    dropboxV2Api     = require('dropbox-v2-api')
    , AWS              = require('aws-sdk')
    , dotenv           = require('dotenv')
    , path             = require('path')
    , formatDate       = require(path.resolve(__dirname, 'functions/formatDate.js'))
    , saveToBucket     = require(path.resolve(__dirname, 'functions/saveToBucket.js'))
    , {PDFDocument}    = require('pdf-lib')

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
        body: body,
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

    const
        s3 = getAwsS3()
        , dropbox = getDropbox();

    console.log('STEP 01 -- Get Latest Cursor')

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

        console.log('STEP 02 -- Prepare Latest Cursor', JSON.stringify(response))

        const params = {
            Bucket : process.env.S3_BUCKET_NAME,
            Key    : `cursor/${process.env.CURSOR_FILENAME}`,
            Body   : Buffer.from(JSON.stringify(response)),
            ACL    : 'private'
        };

        s3.upload(params, (err, data) => {
            console.log('STEP 03 -- Save Latest Token to S3', data)
            if (err) throw err;
            callback(null, data)
        });
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
        , filename = process.env.CURSOR_FILENAME

    const s3 = getAwsS3();

    const params = {
        Bucket : bucket,
        Key    : `${prefix}/${filename}`
    }

    s3.getObject(params, (err, data) => {

        if (err) console.error(err);

        console.log('@@@ DATA @@@', data)

        callback(null, resultToJson(data, 'Body'));
    });
};

/**
 * Get file list
 * @param event
 * @param callback
 * @returns {*}
 */
module.exports.getFileList = (event, callback) => {

    const
        bucket   = process.env.S3_BUCKET_NAME
        , prefix   = 'cursor'
        , filename = process.env.CURSOR_FILENAME

    const s3 = getAwsS3();

    const params = {
        Bucket: bucket,
        Key: `${prefix}/${filename}`
    }

    s3.getObject(params, (err, data) => {

        if (err) {
            console.error(err);
            throw err;
        }

        console.log('@@@ DATA @@@', data)

        let response;

        const
            dropbox  = getDropbox()
            , cursor = resultToJson(data, 'Body').cursor
            , params = {
                resource: 'files/list_folder/continue',
                parameters: {
                    cursor : cursor
                }
            };

        dropbox(params, (err, result, response) => {
            if (err) return console.log(err);

            console.log('@@@ ENTRIES @@@', result)

            let entries = result.entries;

            const downloadables = [];
            entries = entries.map((entry, i) => {
                if (! isDownloadable(entry)) return
                if (! isProofOrArtwork(entry)) return;
                downloadables.push(entry)
            });

            callback(null, {
                files     : downloadables,
                has_files : downloadables.length > 0 ? true : false
            })
        });
    });
};

/**
 * Merge list of PDFs from S3 bucket.
 * @param event
 * @param callback
 */
module.exports.mergePdfs = (event, callback) => {
    const
        s3 = getAwsS3()
        , mergedFiles = []
        , bucket = process.env.S3_BUCKET_NAME
        , prefix = formatDate(false, true)
        , hires  = `${bucket}/${prefix}/HR/`
        , lores  = `${bucket}/${prefix}/LR/`

    const params = {
        Bucket    : process.env.S3_BUCKET_NAME,
        Delimiter : '/'
    }

    let hrPdfDoc, lrPdfDoc, lrPdfs, hrPdfs;

    const uploads = [];

    new Promise((resolve, reject) => {
        console.log('CALL ME 01 -- Create new PDF Doc')
        const newDoc =  PDFDocument.create();
        resolve(newDoc);
    })
        .then((newDoc) => {
            hrPdfDoc = newDoc;
            console.log('CALL ME 02 -- Get PDF list from S3')
            console.log(hrPdfDoc)

            return getPdfsList('HR')
        })
        .then((hrPdfsList) => {
            console.log('CALL ME 03 -- Load PDF list')
            console.log(hrPdfsList)

            return loadPdfsList(hrPdfsList.Contents);
        })
        .then((hrPdfsDocs) => {
            console.log('CALL ME 04 -- Copy PDF pages')
            console.log(hrPdfsDocs)

            return copyPages(hrPdfDoc, hrPdfsDocs);
        })
        .then((hrPages) => {
            console.log('CALL ME 05 -- Add pages to PDF doc')
            console.log(hrPages)

            return addPages(hrPdfDoc, hrPages)
        })
        .then((hrAddedPages) => {
            console.log('CALL ME 06 -- Save PDF Doc')
            console.log(hrAddedPages)

            return hrPdfDoc.save()
            // return getPdfsList('LR')
        })
        .then((pdfUintArray) => {

            console.log('CALL ME 07 -- Prepare PDF upload')

            return new Promise((resolve, reject) => {
                var params = {
                    ACL         : "public-read",
                    Bucket      : process.env.S3_BUCKET_NAME,
                    Key         : `merged/${formatDate(false, true)}--HR.pdf`,
                    Body        : Buffer.from(pdfUintArray),
                    ContentType : "application/pdf"
                };

                var options = {partSize: 10 * 1024 * 1024, queueSize: 1};

                console.log('CALL ME 08 -- Perform PDF upload')

                s3.upload(params, options, (err, data) => {
                    console.log('CALL ME 09 -- PDF upload callback')
                    if (err) reject(err);
                    resolve(data)
                });
            })
        })
        .then((data) => {
            console.log('CALL ME 10 -- Push callback data to global Uploads array')
            uploads.push(data)
        })
        .then((result) => {
            console.log('CALL ME 01-LR -- Create new PDF Doc')
            return PDFDocument.create()
        })
        .then((newDoc) => {
            lrPdfDoc = newDoc;
            console.log('CALL ME 02-LR -- Get PDF list from S3')
            console.log(lrPdfDoc)

            return getPdfsList('LR')
        })
        .then((lrPdfsList) => {
            console.log('CALL ME 03-LR -- Load PDF list')
            console.log(lrPdfsList)

            return loadPdfsList(lrPdfsList.Contents);
        })
        .then((lrPdfsDocs) => {
            console.log('CALL ME 04-LR -- Copy PDF pages')
            console.log(lrPdfsDocs)

            return copyPages(lrPdfDoc, lrPdfsDocs);
        })
        .then((lrPages) => {
            console.log('CALL ME 05-LR -- Add pages to PDF doc')
            console.log(lrPages)

            return addPages(lrPdfDoc, lrPages)
        })
        .then((lrAddedPages) => {
            console.log('CALL ME 06-LR -- Save PDF Doc')
            console.log(lrAddedPages)

            return lrPdfDoc.save()
            // return getPdfsList('LR')
        })
        .then((pdfUintArray) => {

            console.log('CALL ME 07-LR -- Prepare PDF upload')

            return new Promise((resolve, reject) => {
                var params = {
                    ACL         : "public-read",
                    Bucket      : process.env.S3_BUCKET_NAME,
                    Key         : `merged/${formatDate(false, true)}--LR.pdf`,
                    Body        : Buffer.from(pdfUintArray),
                    ContentType : "application/pdf"
                };

                var options = {partSize: 10 * 1024 * 1024, queueSize: 1};

                console.log('CALL ME 08-LR -- Perform PDF upload')

                s3.upload(params, options, (err, data) => {
                    console.log('CALL ME 09-LR -- PDF upload callback')
                    if (err) reject(err);
                    resolve(data)
                });
            })
        })
        .then((data) => {
            console.log('CALL ME 10-LR -- Push callback data to global Uploads array')
            uploads.push(data)
        })

        /*
         * Return results
         */
        .then((result) => {
            console.log('## UPLOADS ##', uploads)
            callback(null, uploads)
        })
}

/**
 * Copies pages in a PDF document.
 * @param pdfDoc
 * @param docs
 * @returns {Promise<unknown>}
 */
const copyPages = (pdfDoc, docs) => {
    const pages = docs.map((pdf) => {
        return new Promise((resolve, reject) => {
            resolve(
                pdfDoc.copyPages(pdf, pdf.getPageIndices())
            );
        })
    })

    return new Promise((resolve, reject) => {
        resolve(Promise.all(pages))
    })
        .then((pages) => {
            return pages.flat()
        })
}

/**
 * Adds page list to a PDF document.
 * @param pdfDoc
 * @param pages
 * @returns {Promise<unknown[]>}
 */
const addPages = (pdfDoc, pages) => {
    const addedPages = pages.map((page) => {
        return new Promise((resolve, reject) => {
            resolve(pdfDoc.addPage(page))
        })
    })

    return Promise.all(addedPages);
}

/**
 * List PDFs in S3 Bucket.
 * @param dir
 * @returns {Promise<unknown>}
 */
const getPdfsList = (dir) => {
    return new Promise((resolve, reject) => {
        const
            s3 = getAwsS3()
            , mergedFiles = []
            , bucket = process.env.S3_BUCKET_NAME
            , prefix = formatDate(false, true)
            , hires  = `${bucket}/${prefix}/HR/`
            , lores  = `${bucket}/${prefix}/LR/`

        const params = {
            Bucket    : process.env.S3_BUCKET_NAME,
            Delimiter : '/',
            Prefix    : `${prefix}/${dir}/`
        }

        s3.listObjects(params, (err, data) => {
            if (err) throw err;
            resolve(data);
        });
    })
}

/**
 * Loads PDF list into buffer.
 * @param files
 * @returns {Promise<unknown[]>}
 */
const loadPdfsList = (files) => {

    const s3 = getAwsS3();

    const buffers = files.map((file) => {
        return new Promise((resolve, reject) => {
            const params = {
                Bucket : process.env.S3_BUCKET_NAME,
                Key    : file.Key
            }

            s3.getObject(params, (err, data) => {
                if (err) reject(err);

                const buffer = data.Body;
                resolve(PDFDocument.load(buffer));
            });
        })
    })

    return Promise.all(buffers);
}

/**
 * Local version of getFileList
 * @returns {Promise<unknown>}
 * @private
 */
// const _getFileList = () => {
//     return new Promise((resolve, reject) => {
//         const
//             bucket   = process.env.S3_BUCKET_NAME
//             , prefix   = 'cursor'
//             , filename = process.env.CURSOR_FILENAME
//
//         const s3 = getAwsS3();
//
//         const params = {
//             Bucket: bucket,
//             Key: `${prefix}/${filename}`
//         }
//
//         s3.getObject(params, (err, data) => {
//
//             if (err) {
//                 console.error(err);
//                 reject(err);
//             }
//
//             console.log('@@@ CURSOR DATA @@@', data)
//
//             const cursor = resultToJson(data, 'Body').cursor;
//
//             console.log('@@@ CURSOR VALUE @@@', cursor)
//
//             let response;
//
//             const dropbox = getDropbox();
//
//             dropbox({
//                 resource: 'files/list_folder/continue',
//                 parameters: {
//                     cursor : cursor
//                 }
//             }, (err, result, response) => {
//
//                 if (err) {
//                     console.error(err);
//                     reject(err);
//                 }
//
//                 try {
//                     let entries = result.entries;
//
//                     console.log('@@@ FILE LIST @@@', entries)
//
//                     const downloadables = [];
//                     entries = entries.map((entry, i) => {
//                         if (! isDownloadable(entry)) return
//                         if (! isProofOrArtwork(entry)) return;
//                         downloadables.push(entry)
//                     });
//
//                     console.log('@@@ DOWNLOADABLES @@@', downloadables)
//
//                     resolve(downloadables);
//                 }
//                 catch(e) { reject(e) }
//             });
//         });
//     })
// }

/**
 * Iterate through all files & Download to S3
 * @param downloadables
 * @returns {Promise<unknown>}
 */
// const downloadAllFiles = (downloadables) => {
//     return new Promise((resolve, reject) => {
//         try {
//             let downloads = [];
//             downloadables.forEach((file) => {
//                 downloads.push(doFileDownload(file))
//             })
//             resolve(downloads);
//         }
//         catch(e) { reject(e) }
//     })
//         .then((downloads) => {
//             return downloads;
//         })
// }

/**
 * Merges a list of PDFs into a single PDF.
 * @param pdfs
 * @returns {Promise<Uint8Array>}
 */
// const doMergePdfs = (downloads) => {
//     return new Promise(async (resolve, reject) => {
//         try {
//             const
//                 merged = await PDFDocument.create()
//
//             const s3 = getAwsS3();
//
//             downloads.forEach((download, i) => {
//                 download.then((file) => {
//                     console.log('### DOWNLOAD FILE ###', file)
//
//                     const params = {
//                         Bucket : file.Bucket,
//                         Key    : file.Key
//                     }
//
//                     s3.getObject(params, (err, data) => {
//
//                         if (err) reject(err);
//
//                         console.log('### S3 OBJECT ###', data)
//
//                         const addPage = async (buffer) => {
//                             const
//                                   pdf   = await PDFDocument.load(buffer)
//                                 , pages = await merged.copyPages(pdf, pdf.getPageIndices())
//
//                             console.log('### PDF ###', pdf)
//
//                             pages.forEach((page) => {
//                                 console.log('Add page to merged PDF')
//                                 merged.addPage(page);
//                             });
//                         }
//
//                         return addPage(data.Body);
//                     });
//                 })
//             })
//
//             // return await merged.save();
//             resolve(await merged.save())
//         }
//         catch(e) { reject(e) }
//     })
//         .then((result) => {
//             resolve(result);
//         })
// }

/**
 * Gets a promise to a file buffer from URL.
 * @param url
 * @returns {Promise<*>}
 */
// const getFileBuffer = async (url) => {
//     const res = await fetch(url, {
//         redirect : 'follow',
//         encoding : null
//     })
//     const buffer = await res.buffer();
//     console.log('@@@ GET FILE BUFFER @@@', buffer)
//     return buffer;
// }

/**
 * Get file list & merge results.
 * @param event
 * @param callback
 */
// module.exports.downloadAndMergePdfs = (event, callback) => {
//
//     _getFileList()
//         .then(downloadAllFiles)
//         .then((downloads) => {
//             console.log('### DOWNLOADED FILES ###', downloads)
//             Promise.all(downloads)
//                 .then((downloads) => {
//                     doMergePdfs(downloads)
//                         .then((result) => {
//                             return result;
//                         })
//                 })
//         })
//         .then((merged) => {
//             console.log('### MERGED ###', merged)
//
//             merged.then((result) => {
//                 const url = saveToBucket(
//                     Buffer.from(result.buffer),
//                     `${formatDate(false, true)}-merged.pdf`,
//                     'merged'
//                 )
//
//                 return url;
//             })
//         })
//         .then((url) => {
//             callback(null, { url : url });
//         })
//         .catch((reason) => {
//             throw new Error(reason);
//         })
// }

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
const doFileDownload = (fileMeta, callback) => {

    if (! callback instanceof Function) {
        callback = (data)=>{ console.log('Call noop on data', data) }
    }

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
        ACL         : "public-read",
        Bucket      : process.env.S3_BUCKET_NAME,
        Key         : `${formatDate(false, true)}/${resolution}/${fileMeta.name}`,
        Body        : stream,
        ContentType : "application/pdf"
    };

    var options = {partSize: 10 * 1024 * 1024, queueSize: 1};

    s3.upload(params, options, (err, data) => {
        if (err) throw err;
        console.log('@@@ S3.UPLOAD DATA @@@', data);
        callback(null, data);
        return data;
    });
}

/**
 * Determine sub-folder to save PDFs in.
 * @param fileMeta
 * @returns {string}
 */
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

    console.log('@@@ downloadFile event.Value @@@', event.Value)
    console.log('@@@ downloadFile event.Index @@@', event.Index)

    doFileDownload(event.Value, callback);

    // return callback(null, event);
};

// /**
//  * Upload file to S3 Bucket
//  * @param event
//  * @param callback
//  * @returns {*}
//  */
// module.exports.uploadFile = (event, callback) => {
//     return callback(null, '\'uploadFile\' ran successfully!');
// };

// /**
//  * Send SNS notification
//  * @param event
//  * @param callback
//  * @returns {*}
//  */
// module.exports.sendNotification = (event, callback) => {
//     return callback(null, '\'sendNotification\' ran successfully!');
// };
