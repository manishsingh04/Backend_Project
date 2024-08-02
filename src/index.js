// require('dotenv').config({ path: './env' })
import dotenv from 'dotenv'
import connectDB from './db/index.js';
import app from './app.js';
dotenv.config({
    path: './env'
    // path: './.env' // both correct

})


connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port ${process.env.PORT}`);
        })
    })
    .catch((error) => {
        console.log("MongoDB Connection problem...!!", error);
    })