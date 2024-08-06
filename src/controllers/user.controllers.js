import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refresh token in db
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
};


// const generateAccessAndRefreshTokens = async (userId) => {

//     try {

//         const user = await User.findById(userId);
//         const accessToken = user.generateAcessToken()
//         const refereshToken = user.generateRefreshToken()

//         //save refresh tokan in db
//         user.refreshToken = refereshToken
//         await user.save({ validateBeforeSave: false }) // koi validation mat check kro jo model par laga hai save  karne se pehle, direct token ko save karo.

//         return { accessToken, refereshToken }

//     } catch (error) {
//         throw new ApiError(500, "Something went wrong while generating access and referesh token")

//     }
// }


const registerUser = asyncHandler(async (req, res) => {

    //1st. Take the user data from the frontend
    const { username, email, fullName, password } = req.body;

    //2nd. validation of user data.. -> like frontend se data empty na aaye

    //way 1st.
    // if (fullName === "") {

    //     throw new ApiError(400, "fullname is required")
    // }

    // if (username === "") {

    //     throw new ApiError(400, "username is required")
    // }

    //2nd way.. to check direct on all data

    if ([fullName, username, password, email].some((fields) => fields?.trim() === "")) {

        throw new ApiError(400, "All fields are compulsary")
    }

    //3rd... check user exist or not already...
    const existedUser = await User.findOne({

        $or: [{ username }, { email }]
    })

    if (existedUser) {

        throw new ApiError(409, "Username or email is already exist")
    }


    //4th...check for images, avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;  //avatar is compul to available
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //TypeError: Cannot read properties of undefined (reading '0')
    //at file:///C:/YouTube_Backend/src/controllers/user.controllers.js:47:54

    //to handle this problem
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar filee is required")
    }

    //5th....Upload them on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //check avatar is properlly uploaded or not
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //6th..create user object--  create entry in DB

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""  //optional hai, agar coverImage hai toh thik nhi toh empty

    })

    //removing password and refreshToken
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // by default sab select hota hai, hum password and refreshToken deselect kar rahe taaki save hone ke baad db maine, response maine naa aaye ye dono.

    //check for user creation
    if (!createdUser) {

        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response

    return res.status(201).json(

        new ApiResponse(200, createdUser, "User created successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    //Todos:
    //req.body ->data
    // username or email base pr login
    //find user in database
    //password check
    //generate access and refresh token
    // send cookies

    //req.body ->data
    const { username, password, email } = req.body
    console.log(email);  //NOTE: TODOS: REMOVE THIS AFTER CHECK
    console.log(password);



    // username or email base pr login..if user provided then check in db
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    //find user in database
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    //check user db maine exist karta hai ke nhi.....
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    //password check-->isPasswordCorrect custom method used to compare with stored and given password by user-> it will return true or false
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    //check password correct hai ke nhi.....
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid user password")
    }

    //generate access and refresh token

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    //data jo send karna hai ......as a response except password and refresh token
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookies

    //by default cookie frontend se accessable hota hai, aur usko modify bhi kar skate hai,
    // usse bachne ke liye hum options object use krte h, taaki cookie ko sirf server se he modify 
    //ki ja sake... for a security purpose

    const options = {
        httpOnly: true,
        secure: true
    }



    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In successfully"
            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    //TODOS:
    //1st Access token db se remove.
    //2nd Cookie ko bhi remove kr do

    //Access token db se remove.
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    //Cookie remove...
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logout Successfuly")
        )

})


const refreshAccessToken = asyncHandler(async (req, res) => {

    //TODSOS: 1st.Take the token from the cookie or mobile apppi. req.body
    //2nd . Verify the token
    //3rd. Decoded token milne pr , user find kr lenge
    //4th. DB ka refreshToken aur user ka incominFreshToken dono ko
    // match kara lete hai....gara match hota hai mtlb.. to new refreshToken
    //generate kar denge
    //5th.gara match hota hai mtlb.. to new refreshToken
    //generate kar deng

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    //check
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Token")
    }

    try {
        //2nd.
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        //3rd
        const user = await User.findById(decodedToken?._id);

        //check
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        //4th.
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        //5th 
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {

            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")

    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    //TODOS: 
    //1st. take oldpassword and new password
    //2nd. user find kr ke oldpassword match kr lo db ke password se
    //3rd. changed db ka password with new password


    const { oldpassword, newpassword } = req.body;

    //auth middleware maine -> req.user = user ->iska mtlb login hai toh user mil jaayega
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

    //check
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    //3rd.
    user.password = newpassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )

})


const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

const updateUserDetails = asyncHandler(async (req, res) => {

    //TODOS:
    //1st. Jo update karna hai, usko req.body se lelo..
    //2nd. user ko find kro db maine
    //3rd. fir update kr doo
    //4th. then return kar doo updated details

    //1st
    const { fullName, email } = req.body
    //check
    if (!fullName || !email) {
        throw new ApiError(400, "FullName or email is required to update")
    }

    //2nd.
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User data updated successfully"))

})


const updateUserAvatar = asyncHandler(async (req, res) => {

    //1ST-> FIND FILE
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //2ND UPLOAD ON CLODINARY
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    //check uploaded or not
    if (!avatar.url) {
        throw new ApiError(400, "error on uploading avatar file")
    }

    //3rd-> file and user and upload 

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar is uploaded successfully"))




})


const updateUserCoverImage = asyncHandler(async (req, res) => {

    //1ST-> FIND FILE
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file is missing")
    }

    //2ND UPLOAD ON CLODINARY
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //check uploaded or not
    if (!coverImage.url) {
        throw new ApiError(400, "error on uploading coverImage file")
    }

    //3rd-> file and user and upload 

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "coverImage is uploaded successfully"))




})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage
}