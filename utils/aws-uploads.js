const aws = require('../services/aws-setup');
const fs = require('fs');
const path = require('path')
const uploadJson = (json) => {
    try {
        const s3 = new aws.S3();
        var data = {
            Bucket: 'bitron-data',
            Key: 'token-details/tokens.json',
            Body: json,
            ContentEncoding: 'base64',
            ContentType: 'application/json',
            ACL: 'public-read'
        };

        return s3.upload(data, function (err, data) {
            if (err) {
                console.log(err);
                console.log('Error uploading data: ', data);
            } else {
                console.log('succesfully uploaded!!!');
            }
        });
    }
    catch (error) {
        console.log("Error")
        return "Error"
    }
}
const uploadBackUp = async (fileName) => {
    try {

        const testFolder = path.join(__dirname, '../', 'dump', 'crypto', fileName);
        console.log(testFolder)
        const fileContent = fs.readFileSync(testFolder)
        const s3 = new aws.S3();
        var data = {
            Bucket: 'bitron-data',
            Key: 'backUp/' + fileName,
            Body: fileContent
        };

        return s3.upload(data, function (err, data) {
            if (err) {
                console.log(err);
                console.log('Error uploading data: ', data);
            } else {
                fs.unlinkSync(testFolder)
                console.log('succesfully uploaded!!!');
            }
        });
    }
    catch (error) {
        console.log("Error" + error.message)
        return "Error"
    }
}

module.exports = {
    uploadJson: uploadJson,
    uploadBackUp: uploadBackUp
}