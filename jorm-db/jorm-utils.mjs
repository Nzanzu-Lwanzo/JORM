import {dirname,join} from "node:path";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { BadFilePathError, FieldRestrictionError, ModelTypeError } from "./jorm-errors.mjs";
import JORMFieldConstraint from "./jorm-field-constraints.mjs";
import validator from "validator";

/**
 * 
 * @param {object} objects
 * @param {object} objects.ob1
 * @param {object} objects.ob2
 * 
 * Returns true if [ ob1 ] and [ ob2 ] objects have got the same properties names.
 */
export const gotSameProperties = ({ob1,ob2}) => {

    const props_1 = Object.keys(ob1);
    const props_2 = Object.keys(ob2);

    let gotSameProps = props_1.every( key => {
        return props_2.includes(key)
    })

    return gotSameProps;

}


/**
 * 
 * @param {object} data 
 * @param {object} ioCodes
 * 
 * Receives a multidimensional object, extracts the [ type ] property of each of its children
 * and returns an object mapping each object name to its type property value.
 */
export const getShape = (data,ioCodes) => {
    const mapping = {};
    const keys = Object.keys(data);

    keys.forEach( key => {
        mapping[key] = data[key]?.type;
    })
    
    return mapping;
}


/**
 * 
 * @param {object} data 
 * 
 * Receives a multidimensional object, extracts the [ config ] property of each of its children
 * and returns an object mapping each object name to its config property value.
 */
export const getConfig = (data) => {

    const mapping = {};
    const keys = Object.keys(data);

    keys.forEach( key => {

        /**@type {JORMFieldConstraint} */
        let configValue = data[key]?.config;
        let configIsJormFieldConstraintInstance = configValue instanceof JORMFieldConstraint;

        if(configValue && !configIsJormFieldConstraintInstance) throw new ModelTypeError(`Your config must be a ${new JORMFieldConstraint().__class__()} instance.`)

        if (configValue) mapping[key] = configValue.constraints;
    })
    
    return mapping;
}


/**
 * @param {object} options 
 * @param {string} options.modelFilePath
 * @param {string} options.toCreateDirName
 * @param {boolean} options.pathIsFile
 * 
 * @returns {Promise<string>}
 * 
 * Receives as an argument a directory name to create and creates it.
 * 
 */
export const createStorageDir = async ({modelFilePath,toCreateDirName,pathIsFile}) => {

    let dir;

    /**** Create a folder if it doesn't exist */
    if(pathIsFile) {

        /**** Extract the dirname and create a folder inside of it */
        let modelFileDir = dirname(modelFilePath);
        dir = join(modelFileDir,toCreateDirName);

    } else {

        dir = join(modelFilePath,toCreateDirName)
        
    }

    /**** If the directory doesn't exist, create it */
    let path;
    if(!existsSync(dir)) path = await mkdir(dir,{recursive:true});

    return path || dir;
}


/**
 * 
 * @param {object} options
 * @param {string} options.fullDir
 * @param {string} options.modelName
 * @param {string} options.what
 * @param {object | Array} options.data
 * 
 *  @returns {Promise<string> | BadFilePathError}
 */
export const storeToDir = async ({fullDir,modelName,what,data}) => {

    if(fullDir) {
        
        let filePath = join(fullDir,`${modelName}.txt`);

        await writeFile(filePath,JSON.stringify(data),{encoding:"utf-8"});

        return filePath;

    } else {
        throw new BadFilePathError(`We couldn't resolve the path to your ${what} storage directory. This directory is relatively deduced from the [ Json File ] path you provide for your model.`)
    }
}

/**
 * 
 * @param {string | Date} date 
 */
export const isValidDate = (date) => {

    let cond1 = typeof date === "object" && date instanceof Date;
    let cond2 = typeof date === "string" && new Date(date);

    console.log(date)
    console.log(new Date(date))
    
    if(cond1 && cond2) return true;

    return false;
}

/**
 * 
 * @param {object} options
 * @param {Array} options.ENUM
 * @param {string} options.type
 * 
 */
export const ENUMValuesAreSameType = ({ENUM,type}) => {
    return ENUM.every( value => typeof value === type.toLowerCase());
}


/**
 * 
 * @param {object} data 
 * @param {string} configFilePath
 * 
 * @returns {object}
 * 
 */
export const buildRecord = async (newData,configFilePath) => {

    const fileContent = await readFile(configFilePath,{encoding:"utf-8"});

    /**@type {object} */
    const parsedFileContent = JSON.parse(fileContent || "{}");

    const pfKeys = Object.keys(parsedFileContent);

    const toSaveData = {...newData};

    pfKeys.forEach( async key => {

        const data = newData[key];
        const config = parsedFileContent[key];

        let defaultValue = config?.defaultValue;

        if(!data && defaultValue) {
            toSaveData[key] = defaultValue;
        } 

    })

    return toSaveData;

}


export const getNotRequiredFields = () => {

}

/**
 * 
 * @param {object} options
 * @param {string} options.configFilePath
 * @param {string} options.typesFilePath
 * @param {string} options.name
 * @param {JORMFieldConstraint} options.fieldConstraints
 */
export const addAssociationField = async ({
    configFilePath,
    typesFilePath,
    name,
    fieldConstraints
}) => {

    const configFileContent = await readFile(configFilePath,{encoding:"utf-8"});
    const typesFileContent = await readFile(typesFilePath,{encoding:"utf-8"});

    const parsedConfig = JSON.parse(configFileContent || "{}");
    const parsedTypes = JSON.parse(typesFileContent || "{}");

    /** The foreign key will always be the id, which is a number */
    const updatedConfig = {
        ...parsedConfig,
        [name] : {
            allowNull : fieldConstraints.allowNull,
            defaultValue : fieldConstraints.defaultValue,
            unique : fieldConstraints.unique
        }
    }

    /** The foreign key will always be the id, which is a number */
    const updatedTypes = {
        ...parsedTypes,
        [name] : "number"
    }

    /*** Write back the config and the types */
    await writeFile(configFilePath,JSON.stringify(updatedConfig),{encoding:"utf-8"});
    await writeFile(typesFilePath,JSON.stringify(updatedTypes),{encoding:"utf-8"});

}


export const fecthEager = () => {
     // Get the ref field name (string)
            const refFieldName = Object.keys(parsedFileContent).find( key => {
                let endsWithId = key.toLowerCase().endsWith("_id");
                let containsRefModelName = validator.contains(key,relation.model.__name__(),{ignoreCase:true});

                return endsWithId && containsRefModelName;

            })

         
            if(refFieldName) {

                const dataByEagerLoading = allRecords.map( async record => {

                    const relatedData = await relation.model.fetchOne(record[refFieldName]);

                    /*** The reference field that ends with _id */
                    delete record[refFieldName];
                    
                    return {...record,[relation.model.__name__()] : relatedData};
                    
                })


                return Promise.all(dataByEagerLoading);

            } else {

                return allRecords;

            }
} 
