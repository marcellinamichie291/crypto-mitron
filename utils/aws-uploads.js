const aws = require('../services/aws-setup');
const fs = require('fs');
const path = require('path')
const multerS3 = require('multer-s3');
const multer = require('multer')
const uploadJson = (json, key) => {
    try {
        const s3 = new aws.S3();
        var data = {
            Bucket: 'bitron-data',
            Key: key,
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

const uploadAppCast = (fileName) => {
    const testFolder = path.join(__dirname, '../', fileName);
    console.log(testFolder);
    const fileContent = fs.readFileSync(testFolder);
    // console.log(fileContent)
    try {
        const s3 = new aws.S3();
        var data = {
            Bucket: 'bitron-data',
            Key: 'app-data/appcast.xml',
            Body: fileContent,
            ContentEncoding: 'utf8',
            ContentType: 'application/xml',
            ACL: 'public-read'
        };

        return new Promise((resolve, reject) => {
            s3.upload(data, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err)
                    console.log('Error uploading data: ', data);
                } else {
                    fs.unlinkSync(testFolder)
                    resolve(data);
                    console.log('succesfully uploaded!!!');
                }
            })
        });
        // const s3 = new aws.S3();
        // let imageKey;
        // return multer({
        //     storage: multerS3({
        //         s3: s3,
        //         bucket: 'bitron-data',
        //         acl: 'public-read',
        //         ContentType: 'text/xml',
        //         metadata: function (req, file, cb) {
        //             console.log(file)
        //             cb(null, { fieldName: file.fieldname, contentType: file.mimetype });
        //         },
        //         key: async function (req, file, cb) {
        //             imageKey = 'app/appcast.xml';
        //             cb(null, imageKey);
        //         }
        //     })
        // });

    }
    catch (error) {
        console.log(error.message)
        return "Error"
    }
}
const getFiles = () => {
    const s3 = new aws.S3();
    var params = {
        Bucket: 'bitron-data',
        Delimiter: "/",
        Prefix: 'backUp/'
    }

    s3.listObjects(params, function (err, data) {
        if (err) throw err;
        console.log(data);
    });
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
    uploadBackUp: uploadBackUp,
    getFiles: getFiles,
    uploadAppCast: uploadAppCast
}