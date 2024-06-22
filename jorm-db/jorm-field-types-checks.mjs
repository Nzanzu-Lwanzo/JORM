import JORM from "./jorm-model.mjs";
import {readFile} from "node:fs/promises";
import {ModelTypeError} from "./jorm-errors.mjs";
import { TYPES_MAP } from "./jorm-constants.mjs";
import { gotSameProperties } from "./jorm-utils.mjs";


/**
 * 
 * @param {object} options
 * @param {JORM} options.instance
 * @param {object} options.newData
 * @returns {boolean | Error}
 */
export default async function checkFieldType ({instance,newData}) {
    const fileContent = await readFile(instance.typesFilePath,{encoding:"binary"});

    /**@type {object} */
    const parsedFileContent = JSON.parse(fileContent || "{}");

    /***
     * CHECK 
     * 
     * 1. That the properties are the same.
     * 2. That the types registered are the same as the ones provided.
     */

    const ndKeys = Object.keys(newData);
    const pfKeys = Object.keys(parsedFileContent);

    // Perform some checks only if [ instance.coercicion ] option is set to true
    if(instance.coercicion) {

        // Chech if the properties (keys) list have got the same length ***********

        if((ndKeys.length !== pfKeys.length)) {
            const error = new ModelTypeError("You provided more or less properties in instance new record than you specified when creating the table [ Json File ].");

            throw error;
        }

        // ***********************************************************************

        // Check if the types are respected *****************************

        let typesRespected = ndKeys.every( key => {

            /**** For each key in the new data object */

            // 1. Get the type code related to instance property name
            let typeCode = parsedFileContent[key];

            /**** The data can be undefined ( in the examples where the field allow null value) */
            let data = newData[key] || undefined;

            let fromNdType = typeof data;

            let fromMapType = typeof TYPES_MAP[typeCode];
            let v = (fromNdType === fromMapType) || fromNdType == "undefined";
            
            return v;

        })

        if(!typesRespected) {
            throw new ModelTypeError(`You didn't respect the type restriction. -> ${fileContent} or mispelled one field name [${pfKeys.join(" , ")}]`);
        } 

        // *******************************************************************
    }

    // Check if the properties have the same name
    if(!gotSameProperties({ob1:newData,ob2:parsedFileContent})) {
        throw new ModelTypeError("You did not provide the same properties names as specified when creating the table [ Json File ].");
    }

    // Types don't match with the ones provided when creating the table [ Json File ].
    return true;
}