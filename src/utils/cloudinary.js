import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {

    try {
        if (!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfully on cloudinary
        // console.log("file is uploaded successfully", response.url);
        fs.unlinkSync(localFilePath) //successfullyupload hoeke baad local server se remove kr dena hai...
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary filed from server as uplaod got failed.
        return null
    }
}


export { uploadOnCloudinary }