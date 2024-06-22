import JORM from "./jorm-model.mjs";
import {readFile} from "node:fs/promises";
import { FieldRestrictionError } from "./jorm-errors.mjs";
import validator from "validator";

/**
 * 
 * @param {object} options
 * @param {JORM} options.instance
 * @param {object} options.newData
 * 
 * @returns {boolean | Error}
 */
export default async function checkFieldConfig ({instance,newData}) {
    const fileContent = await readFile(instance.configFilePath,{encoding:"binary"});

    /**@type {object} */
    const parsedFileContent = JSON.parse(fileContent || "{}");

    const ndKeys = Object.keys(newData);
    const pfKeys = Object.keys(parsedFileContent);

    let configValid = ndKeys.every( async key => {

        const data = newData[key];
        const config = parsedFileContent[key];

        let allowNull = config?.allowNull;
        let defaultValue = config?.defaultValue;
        let unique = config?.unique;

        /**** VALIDATE NON NULL VALUES */
        if(!allowNull && (!data && !defaultValue)) {
            throw new FieldRestrictionError(`You must provide a value for the ${key} field.`)
        }

        /*** VALIDATE UNIQUE VALUES */
        if(unique) {

            /**@type {Array} */
            const allRecords = await instance.fetchAll();

            /*** UNIQUE STRINGS */
            if(typeof data === "string") {
                let isDuplicate = allRecords.some( record => {
                    
                    /**@type {string} */
                    let inDtbs = record[key];

                    /**@type {string} */
                    let inNew = newData[key];

                    return inDtbs?.trim().toLowerCase() === inNew?.trim().toLowerCase();
                })

                if(isDuplicate) {
                    throw new FieldRestrictionError(`[ ${key} ] value must be unique.`)
                }
            }

            /*** UNIQUE ARRAYS */

            if(typeof data === "object" && Array.isArray(data)) {
                
            }
        }

        if(!validateField({
            data,
            field : key,
            config
        })) {
            throw new FieldRestrictionError("NOT_FORECASTED_ERROR")
        }

        return true;

    })

    return configValid;

}


/**
 * 
 * @param {object} options
 * @param {any} options.data
 * @param {string} options.field
 * @param {object} options.config
 * 
 * @returns {boolean | FieldRestrictionError}
 */
export function validateField ({data,field,config}) {

    /**** VALIDATE STRING */
    if(typeof data === "string") {
            
        let stringMaxLength = config?.string?.maxLength;
        let stringMinLength = config?.string?.minLength;
        let isMail = config?.string?.isMail;
        let isURL = config?.string?.isURL;
        /**@type {Array} */
        let string_in = config?.string?.in;
        /**@type {Array} */
        let string_none = config?.string?.none;
        let startsWith = config?.string?.startsWith;
        let endsWith = config?.string?.endsWith;
        let contains = config?.string?.contains;
        let iCase = config?.string?.iCase;

        if((stringMaxLength && data.length > stringMaxLength)) {
            throw new FieldRestrictionError(`[ ${field} ] value should have ${stringMaxLength} max length.`)
        }

        else if((stringMinLength && data.length < stringMinLength)) {
            throw new FieldRestrictionError(`[ ${field} ] value should have ${ stringMinLength } min length.`)
        }

        else if( string_in && !string_in.includes(data)) {
            throw new FieldRestrictionError(`[ ${field} ] value should be one of [${string_in.join(" , ")}].`)
        }
        
        else if (string_none && string_none.includes(data)) {
            throw new FieldRestrictionError(`[ ${field} ] value should not be one of [${string_in.join(" , ")}].`)
        }

        else if (
            startsWith && !data
                            .toLowerCase()
                            .startsWith(startsWith.toLowerCase())
        ) {
            throw new FieldRestrictionError(`[ ${field} ] value should should start with [${startsWith}].`)
        }

        else if( 
            endsWith && !data
                            .toLowerCase()
                            .endsWith(endsWith.toLowerCase())
        ) {
            throw new FieldRestrictionError(`[ ${field} ] value should should end with [${endsWith}].`)
        } 
        
        else if(
            contains && !validator.contains(data,contains,{ignoreCase:true,minOccurrences:1})
        ) {
            throw new FieldRestrictionError(`[ ${field} ] value should contain [${contains}].`)
        }

        else { null }

        /** STRING TYPE VALIDATION */

        if (isMail && ! validator.isEmail(data)) {
            throw new FieldRestrictionError(`[ ${field} ] value should be valid email adress string.`)
        }

        else if (isURL && !validator.isURL(data)) {
            throw new FieldRestrictionError(`[ ${field} ] value should be valid URL string.`)
        }

    }

    /**** VALIDATE ARRAY LENGTH */
    if (typeof data === "object" && Array.isArray(data)) {

        let arrayMaxLength = config?.array?.maxLength;
        let arrayMinLength = config?.array?.minLength;

        if((arrayMaxLength && data.length > arrayMaxLength)) {
            throw new FieldRestrictionError(`[ ${field} ] array should have ${arrayMaxLength} max length.`)
        }

        else if((arrayMinLength && data.length < arrayMinLength)) {
            throw new FieldRestrictionError(`[ ${field} ] array should have ${ arrayMinLength } min length.`)
        }

        else { null }
    }

    /*** VALIDATE NUMBERS */
    if(typeof data==="number") {

        
        let numberMin = config?.number?.min;
        let numberMax = config?.number?.max;
        let gt = config?.number?.gt;
        let lt = config?.number?.lt;
        let gte = config?.number?.gte;
        let lte = config?.number?.lte;

        if((numberMin && data < numberMin)) {
            throw new FieldRestrictionError(`[ ${field} ] value shouldn't be less than ${numberMin}`)
        } 
        
        else if((numberMax && data > numberMax)) {
            throw new FieldRestrictionError(`[ ${field} ] value shouldn't be more than ${numberMax}`)
        } 

        else if(gt && !(data > gt)) {
            throw new FieldRestrictionError(`[ ${field} ] value be strictly greater than ${gt}`)
        }

        else if(lt && !(data < lt)) {
            throw new FieldRestrictionError(`[ ${field} ] value be strictly lesser than ${lt}`)
        }

        else if (gte && !(data >= gte)) {
            throw new FieldRestrictionError(`[ ${field} ] value be strictly greater than or equal to ${gte}`)
        }

        else if (lte && !(data <= lte)) {
            throw new FieldRestrictionError(`[ ${field} ] value be strictly lesser than or equal to ${lte}`)
        }               
        
        else { null }
    }

    /*** VALIDATES DATES */
    if(validator.isDate(data)) {

        let dateIsAfter = config?.date?.isAfter;
        let dateIsBefore = config?.date?.isBefore;

        if(dateIsAfter && !validator.isAfter(data,dateIsAfter)) {
            throw new FieldRestrictionError(`[ ${field} ] value must be after ${dateIsAfter}`);
        } 

        else if (dateIsBefore && !validator.isBefore(data,dateIsBefore)) {
            throw new FieldRestrictionError(`[ ${field} ] value must be before ${dateIsBefore}`);
        }
        
        else {null}
    }


    return true

}