import User from "./model.mjs";


/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const create = async (request,response) => {

    const data = request.body;

    const user = await User.create(data);

    response.status(201).json(user);

}
/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const getAll = async (request,response) => {

    const allUsers = await User.fetchAll();

    response.json(allUsers);

}
/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const getUserTaks = async (request,response) => {

}
/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const deleteAll = async (request,response) => {

}
/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const deleteOne = async (request,response) => {

}