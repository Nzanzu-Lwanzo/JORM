import { Router } from "express";
import { create, getAll } from "./controller.mjs";

const userRouter = Router();


userRouter.get("/",getAll);

userRouter.post("/",create);

export default userRouter;