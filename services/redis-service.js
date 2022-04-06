const redis = require('redis');
// const client = redis.createClient();
const client = redis.createClient("6380", "127.0.0.1");
client.connect();
client.on('connect', function () {
    console.log('Connected!');
});
module.exports = client