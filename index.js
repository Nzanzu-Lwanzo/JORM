/*************************************
 *  IMPORTS
 * ***********************************
 */

import dotenv from "dotenv";
import express from "express";
import testAppRouter from "./test-app/router.mjs";
dotenv.config();


/*************************************
 * INSTANCES AND CONSTANTS
 * ***********************************
 */

const app = express();
const PORT = process.env.PORT;


/*************************************
 * MIDDLEWARES
 * ***********************************
 */

app.use(express.json());
app.use(express.static("./public"));


/**************************************
 * ROUTER
 * ************************************
 */

app.use(
    
    /**
     * 
     * @param {import("express").Request} request 
     * @param {import("express").Response} response 
     * @param {Function} next 
     */
    (request,response,next) => {

        const method = request.method;
        const origin = request.url;
        const now = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

        console.log(`[ ${method} ] -> ${origin} : [ ${now} ]`);

        next()


})
app.use("/api/jorm",testAppRouter);


/*************************************
 * SERVER
 * ***********************************
 */

app.listen(PORT,() => {
    console.log(`Server -> http://localhost:${PORT}/ -> OK`)
})

