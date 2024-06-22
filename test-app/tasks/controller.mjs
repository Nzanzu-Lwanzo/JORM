import Task from "./model.mjs";


/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const create = async (request,response) => {

    try {
        const data = request.body;
        const task = await Task.create({...data});
    
        response.status(201).json(task);

    } catch(e) {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }
   
}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const fetchAll = async (request,response) => { 

    try {

        response.json(await Task.fetchAll(

            /**@param {Array} allRecords */
            (allRecords) => {
            
                return allRecords.filter(record => {
    
                    /**
                     * You can filter here (that's how you perform "where" query)
                     * Ex : return record.colors.includes("red");
                     * 
                     * */
    
                    return true;
                    
                })
            
    
        },false)) 

    } catch(e)  {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }

}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response
 */
export const fetchOne = async (request,response) => {

    try {

        let {id} = request.params;
        const task = await Task.fetchOne(id);
        
        if(!task) response.statusCode(404);

        response.json(task || {});

    } catch(e) {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }

}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const deleteAll = async (request,response) => {

    try {

        await Task.deleteAll(
            /**@param {Array} allRecords */
            (allRecords) => {
                
                /**
                 * If you don't filter, everything will be deleted
                 */
    
                return allRecords.filter( record => true)
    
        },true)
    
        response.sendStatus(204);

    } catch(e) {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }
}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const deleteOne = async (request,response) => {

    try {

        let {id} = request.params;

        const isDeleted = await Task.deleteOne(id,
            /**@type {object} */
            (Task) => {
    
            /**** What will you do with the record you deleted ? */
    
            console.log(Task)
    
    
        });
    
        response.sendStatus(204);

    } catch(e) {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }

}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const updateMany = (request,response) => {

}

/**
 * 
 * @param {import("express").Request} request 
 * @param {import("express").Response} response 
 */
export const updateOne = async (request,response) => {

    try {

        let {id} = request.params;
        const updateData = request.body;
    
        const task = await Task.updateOne({lookupValue:id},updateData);
    
        response.json(task);

    } catch(e) {

        response.status(400).json({
            name : e.name,
            message : e.message
        })

    }
}