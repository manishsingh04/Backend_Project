import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



const generateAccessAndRefreshTokens = async (userId) => {

    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAcessToken()
        const refereshToken = user.generateRefreshToken()

        //save refresh tokan in db
        user.refreshToken = refereshToken
        await user.save({ validateBeforeSave: false }) // koi validation mat check kro jo model par laga hai save  karne se pehle, direct token ko save karo.

        return { accessToken, refereshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and referesh token")

    }
}


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

    // username or email base pr login..if user provided then check in db
    if (!username || !email) {
        throw new ApiError(400, "Username or email is required")
    }

    //find user in database
    const user = User.findOne({
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


export {
    registerUser,
    loginUser,
    logoutUser
}