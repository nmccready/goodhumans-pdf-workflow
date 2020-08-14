/**
 * Formats a file name using date.
 * @param withTime
 * @returns {string}
 */
const formatDate = (withTime, yearFirst) => {
    const date = new Date()

    const pad = (n, len) => {
        let x = 1, padding = '';
        while (x < len) {
            padding += '0';
            x++;
        }
        return (padding + n).slice(-len)
    }

    let ts = [
        pad(date.getMonth()+1, 2),
        pad(date.getDate(), 2),
        date.getFullYear()
    ];

    if (yearFirst) {
        ts.reverse();
    }

    ts = ts.join('-');

    if (withTime) {
        ts += '-' + [
            pad(date.getHours(), 2),
            pad(date.getMinutes(), 2),
            pad(date.getSeconds(), 2),
            pad(date.getMilliseconds(), 3)
        ].join('-')
    }

    return ts;
}

module.exports = formatDate;
