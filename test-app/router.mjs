import { Router } from "express";
import {
    create,
    deleteAll,
    deleteOne,
    fetchAll,
    fetchOne,
    updateOne
} from "./controller.mjs";

const testAppRouter = Router();

/********** REGISTER ROUTE HANDLERS *********** */

testAppRouter.get("/:id/",fetchOne);

testAppRouter.get("/",fetchAll);

testAppRouter.post("/",create);

testAppRouter.delete("/",deleteAll);

testAppRouter.delete("/:id/",deleteOne);

testAppRouter.patch("/:id/",updateOne);


/********************************************** */

export default testAppRouter;