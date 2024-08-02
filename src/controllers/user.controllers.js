import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


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

export { registerUser }