import { asyncHandler } from "../utils/asyncHandler.js"; //1
import { ApiError } from "../utils/ApiError.js"; //1
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";



//(req, res,next)-> jo _ hai res ke jagah pr wo isliye hai q ke res ka kaam nhi h, toh uske
//place pr _ place kr skate hai, ye production grade application ka tarika hai
export const veriyJWT = asyncHandler(async (req, _, next) => {

    try {
        //1st.cookie ye  cookie parser middleware se lelo
        //ya toh custom header se lelo, jo postman maine hota hai
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        //check token
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        //agar token mil gya hai toh usko varify karna padega ke, wo valid token hai ke nhi

        //it takes 2 parameters
        //jwt.verify(token which need to verify, that token secret key to decode)
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        //ab humko user find karna hai...

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        //verify user
        if (!user) {
            //NEXT_DISCUSSION:: ABOUT FRONTEND 
            throw new ApiError(401, "Invalid access token")
        }

        //agar user hai toh new object insert kar doo.  req.body
        req.user = user
        next()
    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid access tokennn")

    }
})



