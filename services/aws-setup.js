require("dotenv").config();
const aws = require('aws-sdk')
aws.config.update({
    secretAccessKey: 'ARfVxYg0vOz5hX+bV0WauSHCTM+Mrh5a8ATlLXeo',
    accessKeyId: 'AKIAXWKW3V3VIX3XOF4Y',
    region: 'ap-south-1'
});

module.exports = aws;
