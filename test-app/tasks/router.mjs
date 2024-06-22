import { Router } from "express";
import {
    create,
    deleteAll,
    deleteOne,
    fetchAll,
    fetchOne,
    updateOne
} from "./controller.mjs";

const taskRouter = Router();

/********** REGISTER ROUTE HANDLERS *********** */

taskRouter.get("/:id/",fetchOne);

taskRouter.get("/",fetchAll);

taskRouter.post("/",create);

taskRouter.delete("/",deleteAll);

taskRouter.delete("/:id/",deleteOne);

taskRouter.patch("/:id/",updateOne);


/********************************************** */

export default taskRouter;