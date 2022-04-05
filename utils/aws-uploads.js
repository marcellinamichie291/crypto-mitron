const aws = require('../services/aws-setup');
const uploadJson = (json) => {
    try {
        const s3 = new aws.S3();
        var data = {
            Bucket: 'bitron-test',
            Key: 'token-details/testToken.json',
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
module.exports = {
    uploadJson: uploadJson
}