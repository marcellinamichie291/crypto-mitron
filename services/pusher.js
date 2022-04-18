const Pusher = require("pusher");
const pusher = new Pusher({
    appId: "1355944",
    key: "1665016a8f2d3afa4cf6",
    secret: "9c047791a11233610079",
    cluster: "ap2",
    useTLS: true
});
module.exports = pusher