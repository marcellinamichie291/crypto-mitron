const moment = require('moment-timezone');
module.exports = getCurrentDateTime = () => {
    let date = moment()
        .tz("Asia/Calcutta")
        .format("DD/MM/YYYY,h:mm:ss a")
        .split(",")[0];

    let time = moment()
        .tz("Asia/Calcutta")
        .format("DD/MM/YYYY,h:mm:ss a")
        .split(",")[1];

    return [date, time];
}