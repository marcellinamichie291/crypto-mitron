const redis = require('redis');
// const client = redis.createClient();
console.log(process.env.REDIS_IP + "  " + process.env.REDIS_PORT);
const client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_IP);
client.connect();
client.on('connect', function () {
    console.log('Connected!');
});
client.on('error', (err) => { console.log(err) });
module.exports = client