const dropboxV2Api = require('dropbox-v2-api');

// create session ref:
const dropbox = dropboxV2Api.authenticate({
    token: 'your token'
});
