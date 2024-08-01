//1st method : promise

const asyncHandler = (requestHandler) => {

    return (req, res, next) => {
        Promise.resolve((requestHandler(req, res, next))).catch((err) => next(err))
    }
}




export { asyncHandler }


//This is a higher order function-> JS Chai aur code
//syntax

// const asyncHandler = ()=> {}
// const asyncHandler = (fn) => ()=>{}
// const asyncHandler = (fn) => async()=>{}

//2nd method -> try catch
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }
