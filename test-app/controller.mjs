import User from "./model.mjs";


/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const create = async (request,response) => {

    const data = request.body;
    const user = await User.create({...data,date:new Date().toISOString()});

    response.status(201).json(user);
}

/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const fetchAll = async (request,response) => { 

    response.json(await User.fetchAll(

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
}

/**
 * 
 * @param {Request} request 
 * @param {Response} response
 */
export const fetchOne = async (request,response) => {
    let {id} = request.params;
    const user = await User.fetchOne(id);
    response.json(user || {});
}

/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const deleteAll = async (request,response) => {

    await User.deleteAll(
        /**@param {Array} allRecords */
        (allRecords) => {
            
            /**
             * If you don't filter, everything will be deleted
             */

            return allRecords.filter( record => true)

    },true)

    response.sendStatus(204);
}

/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const deleteOne = async (request,response) => {

    let {id} = request.params;

    const isDeleted = await User.deleteOne(id,
        /**@type {object} */
        (user) => {

        /**** What will you do with the record you deleted ? */

        console.log(user)


    });

    response.sendStatus(204);

}

/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const updateMany = (request,response) => {

}

/**
 * 
 * @param {Request} request 
 * @param {Response} response 
 */
export const updateOne = async (request,response) => {

    let {id} = request.params;
    const updateData = request.body;

    const user = await User.updateOne({lookupValue:id},updateData);

    response.json(user);
}