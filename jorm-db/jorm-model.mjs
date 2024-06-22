import {
    writeFile,
    readFile,
    mkdir,
    appendFile,
    unlink
} from "node:fs/promises";

import { existsSync, statSync, write } from "node:fs";

import { 
    BadFilePathError,
    ModelTypeError,
    FieldRestrictionError
} from "./jorm-errors.mjs";

import { 
    join,
    basename,
} from "node:path";

import {
    gotSameProperties,
    getShape,
    getConfig,
    createStorageDir,
    storeToDir,
    validateMail,
    validateURL
} from "./jorm-utils.mjs";

import { TYPES_MAP, DIARY_CONFIG } from "./jorm-constants.mjs";

import DataProcessor from "./jorm-data-processor.mjs";

export default class JORM {

    #prohibitedFilePathValues = [".","/"];
    #tsDir = "types-storage";
    #configDir = "fields-config";

    /**
     * 
     * Creates the folder that will contain all the types files.
     * 
     */
    #createTypesStorageDir = async () => {
        let path = await createStorageDir({
            modelFilePath : this.modelFilePath,
            toCreateDirName : this.#tsDir,
            pathIsFile : this.pathIsFile
        })

        return path;
    }

    #createConfigStorageDir = async () => {
        let path = await createStorageDir({
            modelFilePath : this.modelFilePath,
            toCreateDirName : this.#configDir,
            pathIsFile : this.pathIsFile
        })

        return path;
    }


    /**
     * 
     * @param {object} shape 
     * 
     * Store the types of this particular model [ table, Json File ] in a binary encoded [ .txt ] file.
     */
    #storeTypes = async (shape) => {

        let tsFullDir = await this.#createTypesStorageDir(); 

        const filePath = await storeToDir({
            fullDir : tsFullDir,
            modelName : this.modelName,
            what : "types",
            data : shape
        })  
    }

    #storeConfig = async (config) => {

        let tsFullDir = await this.#createConfigStorageDir(); 
        
        const filePath = await storeToDir({
            fullDir : tsFullDir,
            modelName : this.modelName,
            what : "config",
            data : config
        })  
    }

    /**
     * @param {object} newData
     * 
     * On each "create" operation performed, it fetches that initial data from the [ .txt ] file,
     * confront it to the new data and makes sure that the property and their initial types match.
     * 
     */
    #checkTypes = async (newData) => {

        const fileContent = await readFile(this.typesFilePath,{encoding:"binary"});

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

        // Perform some checks only if [ this.coercicion ] option is set to true
        if(this.coercicion) {

            // Chech if the properties (keys) list have got the same length ***********

            if((ndKeys.length !== pfKeys.length)) {
                const error = new ModelTypeError("You provided more or less properties in this new record than you specified when creating the table [ Json File ].");

                throw error;
            }

            // ***********************************************************************

            // Check if the types are respected *****************************

            let typesRespected = ndKeys.every( key => {

                /**** For each key in the new data object */

                // 1. Get the type code related to this property name
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


    #checkConfig = async (newData) => {
        
        const fileContent = await readFile(this.configFilePath,{encoding:"binary"});

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

            let numberMin = config?.number?.min;
            let numberMax = config?.number?.max;
            let gt = config?.number?.gt;
            let lt = config?.number?.lt;
            let gte = config?.number?.gte;
            let lte = config?.number?.lte;

            let arrayMaxLength = config?.array?.maxLength;
            let arrayMinLength = config?.array?.minLength;

            /**** VALIDATE NON NULL VALUES */
            if(!allowNull && !data && !key==="boolean") {
                throw new FieldRestrictionError(`You must provide a value for the ${key} field.`)
            }

            /*** VALIDATE UNIQUE VALUES */
            if(unique) {

                /**@type {Array} */
                const allRecords = await this.fetchAll();

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

            /**** VALIDATE STRING LENGTH */
            if(typeof data === "string") {

                if((stringMaxLength && data.length > stringMaxLength)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should have ${stringMaxLength} max length.`)
                }

                else if((stringMinLength && data.length < stringMinLength)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should have ${ stringMinLength } min length.`)
                }

                else if( string_in && !string_in.includes(data)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should be one of [${string_in.join(" , ")}].`)
                }
                
                else if (string_none && string_none.includes(data)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should not be one of [${string_in.join(" , ")}].`)
                }

                else if (
                    startsWith && !data
                                    .toLowerCase()
                                    .startsWith(startsWith.toLowerCase())
                ) {
                    throw new FieldRestrictionError(`[ ${key} ] value should should start with [${startsWith}].`)
                }

                else if( 
                    endsWith && !data
                                    .toLowerCase()
                                    .endsWith(endsWith.toLowerCase())
                ) {
                    throw new FieldRestrictionError(`[ ${key} ] value should should end with [${endsWith}].`)
                } 
                
                else if(
                    contains && !data
                                    .toLowerCase()                    
                                    .includes(contains.toLowerCase())
                ) {
                    throw new FieldRestrictionError(`[ ${key} ] value should contain [${contains}].`)
                }
                else { null }

            }

            /**** VALIDATE STRING TYPES */
            if(typeof data === "string") {
                if(isURL && !validateURL(data)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should be a URL.`)
                }

                if(isMail && !validateMail(data)) {
                    throw new FieldRestrictionError(`[ ${key} ] value should be an email.`)
                }
            }

            /**** VALIDATE ARRAY LENGTH */
            if (typeof data === "object" && Array.isArray(data)) {

                if((arrayMaxLength && data.length > arrayMaxLength)) {
                    throw new FieldRestrictionError(`[ ${key} ] array should have ${arrayMaxLength} max length.`)
                }

                else if((arrayMinLength && data.length < arrayMinLength)) {
                    throw new FieldRestrictionError(`[ ${key} ] array should have ${ arrayMinLength } min length.`)
                }

                else { null }
            }

            /*** VALIDATE NUMBERS */
            if(typeof data==="number") {
                if((numberMin && data < numberMin)) {
                    throw new FieldRestrictionError(`[ ${key} ] value shouldn't be less than ${numberMin}`)
                } 
                
                else if((numberMax && data > numberMax)) {
                    throw new FieldRestrictionError(`[ ${key} ] value shouldn't be more than ${numberMax}`)
                } 

                else if(gt && !(data > gt)) {
                    throw new FieldRestrictionError(`[ ${key} ] value be strictly greater than ${gt}`)
                }

                else if(lt && !(data < lt)) {
                    throw new FieldRestrictionError(`[ ${key} ] value be strictly lesser than ${lt}`)
                }

                else if (gte && !(data >= gte)) {
                    throw new FieldRestrictionError(`[ ${key} ] value be strictly greater than or equal to ${gte}`)
                }

                else if (lte && !(data <= lte)) {
                    throw new FieldRestrictionError(`[ ${key} ] value be strictly lesser than or equal to ${lte}`)
                }               
                
                else { null }
            }

            return true;

        })

        return configValid;

    }

    
    /**
     * 
     * @param {object} JORMConstructor
     * @param {object} JORMConstructor.model
     * @param {string} JORMConstructor.model.modelFilePath
     * @param {string} JORMConstructor.model.modelName
     * @param {object} JORMConstructor.model.modelShape
     * @param {object} JORMConstructor.options
     * @param {string} JORMConstructor.options.lookup
     * @param {boolean} JORMConstructor.options.coercicion
     * @param {boolean} JORMConstructor.options.raw
     * @param {boolean} JORMConstructor.options.autoCreateDate
     * @param {boolean} JORMConstructor.options.autoUpdateDate
     * @param {string} JORMConstructor.options.encoding
     * @param {boolean} JORMConstructor.options.plurify
     */
    constructor ({
        model,
        options = {
            lookup : undefined,
            coercicion : true,
            raw : false,
            autoCreateDate : true,
            autoUpdateDate : true,
            encoding : undefined,
            plurify : true
        }
    }) {

        this.modelFilePath = model.modelFilePath;
        this.modelName = model.modelName;
        this.modelShape = model.modelShape;
        this.lookup = options.lookup || "id";
        this.coercicion = options.coercicion;
        this.raw = options.raw;
        this.autoCreateDate = options.autoCreateDate;
        this.autoUpdateDate = options.autoUpdateDate;
        this.encoding = options.encoding || "binary";
        this.plurify = options.plurify

        this.pathIsFile = statSync(this.modelFilePath).isFile();
        
    }

    __class__() {
        return "JORM"
    }

    __name__() {
        return this.modelName?.toUpperCase() || "no-model-name"
    }


    /**
     * Creates a table [ Json File ] in the database.
     * 
     * @returns {void}
     */
    async model () {

        let pathNoExist = !this.modelFilePath;
        let pathIsProhibited = this.#prohibitedFilePathValues.includes(this.modelFilePath);

        if(pathNoExist || pathIsProhibited) throw new BadFilePathError("You must provide a valid file path. We can't store you database files in the current directory.");

        /**** Get the file path */
        let filePath = this.resolveFilePath();

        /**** Don't create the modelFile if it already exists */
        if(existsSync(filePath)) return;

        if(this.coercicion) {

            /**** Extract an object containg { fieldName : typeCode }  */

            let shape = getShape(this.modelShape);
            let config = getConfig(this.modelShape);

            /***
             * Create a type storage file 
             * 
             * [ shape ] data must be an object { fieldName : typeCode }
             */
            await this.#storeTypes(shape);


            /**
             * Create a configuration storage file 
             * 
             * [ config ] data must be an multidimensional object
             */
            await this.#storeConfig(config);

            /**
             * Create a field diary to store information like the last id
             * so they be unique even if the user deletes everything from their table
             */
            await writeFile(this.diaryFilePath,JSON.stringify(DIARY_CONFIG),{encoding:this.encoding});
        }

        /**** Create the file */

        await writeFile(filePath,JSON.stringify([]),{encoding:this.encoding});
    }

    /**
     * 
     * @returns {string}
     * 
     * Returns the path to the Json File. I
     * If the user didn't specify the file name at the end of the path, 
     * then it will be deduced from the model name and joined to the path provided.
     * Note that an "s" will be added at the end of the name of the files by default.
     * This behavior can be disabled by setting the [ plurify ] option of the constructor to false
     */
    resolveFilePath() {

        /**
         * Make sure that, if the user specified a file name at the of the path,
         * that this file name has got a .json extension.
         * 
         * Determiner si c'est un fichier ou un directoire.
         * Si c'est un fichier, verifier qu'il finit pas JSON.
         * Si c'est un directoire, créer un fichier avec le modelName et l'extension json.
         */

        let filePath;

        if(this.pathIsFile) {

            /**** Check the extension */

            let fileBaseName = basename(this.modelFilePath)
            const fileBaseNameParts = fileBaseName.split(".");
            let [name,extension] = fileBaseNameParts;

            if(extension!=="json") {
                let errMsg = `${this.__class__()} can't store data in a .${extension} file.`
                throw new  BadFilePathError(errMsg);
            }

            /********************************************* */
            filePath = this.modelFilePath;

        } else {
            filePath = join(this.modelFilePath,`${this.modelName}${this.plurify && "s"}.json`);
        }

        return filePath;
    }


    /**
     * 
     * @param {Function} cb
     * @param {boolean} raw
     * 
     * @returns {string | object}
     * 
     * Fetches all the records from the table [ Json File ].
     * If the [ raw ] option is set to true, then the Json data won't be parsed before being returned.
     * 
     */
    async fetchAll (cb,raw=this.raw) {

        if(!this.resolveFilePath()) throw new BadFilePathError("We couldn't find the path to you Json Database File.");

        /**@type {string} */
        const jsonData = await readFile(this.resolveFilePath(),{encoding:"utf-8"});

        if(raw) return new Promise.resolve(jsonData);

        const parsedData = JSON.parse(jsonData || "[]");

        if(cb) return cb(parsedData);

        return Promise.resolve(parsedData);

    }

    /**
     *
     * @param {DataProcessor} dataProcessor
     * 
     * Fecthes all the data from database and processes data in various ways.
     * 
     */
    async fetchAndProcess (dataProcessor) {

        const allRecords = await this.fetchAll();
        
        await dataProcessor.process()
    }

    /**
     * @param {string | number} lookupValue
     * @param {object} options
     * @param {string} options.lookup
     * @param {boolean} options.raw
     * 
     * Fetches a specific record from the table [ Json File ] based on a lookup field.
     * The default lookup field is the id. You can override this value in the definition.
     * If you specify a [ lookup ] options, then that field will be used.
     * 
     * If the [ raw ] option is set to true, then the Json data won't be parsed before being returned.
     */
    async fetchOne (lookupValue,lookup,raw=this.raw) {

        const foundRecord = await this.getObject({
            lookupValue, 
            lookup : lookup || this.lookup 
        });

        if(!foundRecord) return undefined
        if(raw) return Promise.resolve(JSON.string(foundRecord[0]))

        return Promise.resolve(foundRecord);
    }

    /**
     * 
     * @param {object} options 
     * @param {string} options.fieldKey
     * @param {string} options.fieldValue
     * @param {boolean} withNulls
     * @param {object} data
     * @param {Function} cb
     * 
     * Fetches all the data from a specific field.
     * 
     * If the [ withNulls ] option is set to false, then all the null values will be ignored in the return.
     * 
     * By default, a list of object containing the primary key as a key
     * and the value as a property will be returned.
     * 
     * The user can filter records they want to receive information about.
     * 
     * 
     */
    async fetchField (options,withNulls=true,data,cb) {

        let fieldKey = options.fieldKey || "id"
        let fieldValue = options.fieldValue;

        /**@type {array} */
        const _allRecords = data || await this.fetchAll();

        /*** Cb if a callback that's used to filter records */
        const allRecords = cb ? cb(_allRecords) : _allRecords;

        let keyValuePairsList;

        if(withNulls) {

            /**@type {Array} */
            const kvpl = allRecords.map( record => {
                let key = record[fieldKey]
                let value = record[fieldValue]

                if(key) return {[key]:value}
            })

            keyValuePairsList = kvpl.filter( record => {
                return record !== undefined
            })

        } else {

            /**@type {Array} */
            const kvpl = allRecords.map(record => {
                let key = record[fieldKey]
                let value = record[fieldValue]

                /*** Only return if the value is not null */
                if(key && value) return {[key]:value}
            })

            keyValuePairsList = kvpl.filter( record => {
                return record !== undefined
            })

        }

        return keyValuePairsList;
    }


    /**
     * 
     * @param {[object]} fields
     * @param {object} data
     * @param {Function} cb
     * 
     * @returns {Array}
     * 
     * Fetches all the data from a set of fields.
     * 
     * By default, a list of object containing the primary key as a key 
     * and the value as a property will be returned.
     * 
     * The user can filter records they want to receive information about.
     * 
     */
    async fetchFields (fields,data,cb) {
        
        /**
         * @type {Array}
         */
        const _allRecords = data || await this.fetchAll();
        const allRecords = cb ? cb(_allRecords) : _allRecords;

        const fetchedData = fields.map( field => {
            return allRecords.map(record => {
                return {
                    [record.id]: record[field]
                };
            })
        })

        return fetchedData;
    }


    /**
     * 
     * @param {Function} cb
     * @param {boolean} keepFile
     * 
     * Deletes all the records from the table.
     * If the [ keepFile ] option is set to false, 
     * then the file that contains the table will also be deleted.
     * 
     * The user can filter the data they want to delete.
     * 
     */
    async deleteAll(cb,keepFile=true) {

        /**** Delete the model file [ Json File ] */
        if(!keepFile) await unlink(this.resolveFilePath());

        let toWriteToFile;

        if(cb) {

            /**@type {Array} */
            const allRecords = await this.fetchAll();

            /**@type {Array} */
            const recordsToDelete = cb(allRecords);

            if(!Array.isArray(recordsToDelete)) throw new ModelTypeError("You should return an array of objects from your cb filter function.")

            const toDeleteIds = recordsToDelete.map( record => record?.id);
            
            toWriteToFile = allRecords.filter( record => !toDeleteIds.includes(record?.id))

        }  else { toWriteToFile = [] }   
        
        /**** Just replace the content */
        await writeFile(this.resolveFilePath(),JSON.stringify(toWriteToFile),{encoding:this.encoding});
    }


    /**
     * @param {any} lookupValue
     * @param {Function} cb
     * @param {string} lookup
     * 
     * @returns {boolean}
     * 
     * Deletes a specific record from the table [ Json File ] based on a lookup field.
     * The default lookup field is the id. You can override this value in the definition.
     * If you specify a [ lookup ] options, then that field will be used.
     * 
     */
    async deleteOne (lookupValue,cb,lookup) {

        /**@type {object | undefined} */
        const foundRecord = await this.getObject({
            lookupValue, 
            lookup : lookup || this.lookup 
        });
        
        if(!foundRecord) return false;

        /**@type {Array} */
        const allRecords = await this.fetchAll();

        const idx = allRecords.findIndex( record => record.id === foundRecord.id );

        if(idx === -1) return false;

        /*** Deletes the element from the array and processes it if needed */
        const deleted = allRecords.splice(idx,1);
        if(cb) {
            /**
             * @param {object}
             * 
             * Receives an array containing the deleted records.
             */
            cb(deleted);
        }

        await writeFile(this.resolveFilePath(),JSON.stringify(allRecords),{encoding:this.encoding});

        return true;
    }

    /**
     * 
     * @param {string} field
     * @param {Array} data
     * @param {Function} cb
     * 
     * @param {Array}
     * 
     * @returns {void}
     * 
     * Goes over each record in a array of records and 
     * deletes data present in a specific field for each one.
     * 
     * Can take a [ data ] argument as the data to use,
     * otherwise the return value of [ this.fetchAll() ] will be used.
     * 
     * The user can filter the data they want to delete.
     */
    async deleteField (field,data,cb) {

        /**@type {array} */
        const _allRecords = data || await this.fetchAll();
        const allRecords = cb ? cb(_allRecords) : _allRecords;

        /**@type {Array} */
        allRecords.map( record => record[field] = null);
        
        await writeFile(this.resolveFilePath(),JSON.stringify(allRecords),{encoding:this.encoding});
    }


    /**
     * 
     * @param {Array} fields 
     * @param {Array} data
     * @param {Function} cb
     * 
     * @returns {void}
     * Goes over each record in a array of records and 
     * deletes data present in a set of fields for each one.
     * 
     * Can take a [ data ] argument as the data to use,
     * otherwise the return value of [ this.fetchAll() ] will be used.
     * 
     * The user can filter the data they want to delete.
     * 
     */
    async deleteFields (fields,data,cb) {
        
        /**@type {array} */
        const _allRecords = data || await this.fetchAll();
        const allRecords = cb ? cb(_allRecords) : _allRecords;

        allRecords.map( record => {
            return fields.forEach( field => {
                return record[field] = null
            })
        })

        await writeFile(this.resolveFilePath(),JSON.stringify(allRecords),{encoding:this.encoding})
    }


    /**
     * 
     * @param {object} data 
     * 
     * @returns {object}
     * 
     * Creates a JORM record but don't save it into the table [ Json File ].
     * This record is returned with a computed primary key value up to date.
     * 
     * By default, a [ create_date ] field is added to each table
     * unless the [ autoCreateDate ] constructor option is set to false.
     */
    async record (data) {

          /***** DON'T CHECK FOR COERCICION INSIDE OF THIS FUNCTION */

          let typesOk = await this.#checkTypes(data);
          let configOk = await this.#checkConfig(data);
  
            if(typesOk && configOk) {
                
                try {
                    let fileContent = await readFile(this.resolveFilePath(),{encoding:this.encoding});
    
                    /**@type {Array} */
                    const parsedFileContent = JSON.parse(fileContent || "[]");
        
                    /*** GET THE ID */
        
                    /**@type {object} */
                    const lastRecord = parsedFileContent.at(-1);
                    let lastId = lastRecord?.id;
        
                    let id;
    
                    if(lastId) {
                        /*** There's no last id, that means there was no record in the file. */
                        /*** If so, read the id from the file */
                        id = lastId+1
    
                    } else {
                        const parsedContent = await this.getFieldDiaryContent();
                        let last_id = parsedContent.last_id || 0;
                        id = last_id + 1;
                    }    
        
                    /*** FORM THE NEW RECORD */
                    const newRecord = {id,...data};
    
                    if(this.autoCreateDate) {
                        newRecord.created_at = new Date();
                    } 
                              
                   
                    return {
                        data : newRecord,
                        save : async () => {

                            /*** WRITE THE NEW LAST_ID BACK TO THE FILE */

                            await writeFile(
                                this.diaryFilePath,
                                JSON.stringify({...this.getFieldDiaryContent(),last_id:id}
                            ))

                            /*** SAVE THE RECORD TO THE DATABASE */
                        
                            const freshData = [...parsedFileContent,newRecord];
                            await writeFile(this.resolveFilePath(),JSON.stringify(freshData),{encoding:this.encoding});
                            
                            return newRecord;
                        }
                    };
    
                } catch(e) {
                    const error = new Error(e.message);
                    error.stack = e.stack;

                    throw error;
                }
    
            } else {
                throw new ModelTypeError("Either type checks or configuration checks haven't been successfully concluded !")
            }
    }


    /**
     * 
     * @param {object} data 
     * @returns {Promise<object> | Error}
     * 
     * Creates a JORM record and directly saves it into the database [ Json File ].
     * 
     * By default, a [ create_date ] field is added to each table
     * unless the [ autoCreateDate ] constructor option is set to false.
     */
    async create (data) {

        /***** DON'T CHECK FOR COERCICION INSIDE OF THIS FUNCTION */

        let typesOk = await this.#checkTypes(data);
        let configOk = await this.#checkConfig(data);

        if(typesOk && configOk) {
            
            try {
                let fileContent = await readFile(this.resolveFilePath(),{encoding:this.encoding});

                /**@type {Array} */
                const parsedFileContent = JSON.parse(fileContent || "[]");
    
                /*** GET THE ID */
    
                /**@type {object} */
                const lastRecord = parsedFileContent.at(-1);
                let lastId = lastRecord?.id;
    
                let id;

                if(lastId) {
                    /*** There's no last id, that means there was no record in the file. */
                    /*** If so, read the id from the file */
                    id = lastId+1

                } else {
                    const parsedContent = await this.getFieldDiaryContent();
                    let last_id = parsedContent.last_id || 0;
                    id = last_id + 1;
                }

                /*** WRITE THE NEW LAST_ID BACK TO THE FILE */
                await writeFile(
                    this.diaryFilePath,
                    JSON.stringify({...this.getFieldDiaryContent(),last_id:id}
                ))

    
                /*** FORM THE NEW RECORD */
                const newRecord = {id,...data};

                if(this.autoCreateDate) {
                    newRecord.created_at = new Date();
                }

                if(this.autoUpdateDate) {
                    newRecord.last_update = new Date();
                }
    
                /*** RECONSTITUTE THE OBJECT */
                const freshData = [...parsedFileContent,newRecord];
    
                /*** WRITE BACK TO THE FILE */
                await writeFile(this.resolveFilePath(),JSON.stringify(freshData),{encoding:this.encoding});
    
                return newRecord

            } catch(e) {
               const error = new Error(e.message);
               error.stack = e.stack;

               throw error;
            }

        } else {
            throw new ModelTypeError("Either type checks or configuration checks haven't been successfully concluded !")
        }
        
    }

    /**
     * @param {object} options
     * @param {number | string} options.lookupValue
     * @param {string} options.lookup
     * @param {object} newData
     * 
     * @returns {undefined | object}
     * 
     * Updates one record. 
     * It's advisable to use this function inside of a  [ .then() ] statement after calling 
     * [ this.fetchOne() ] which returns an instance fetched from the table [ Json File ].
     */
    async updateOne ({lookupValue,lookup=this.lookup},newData) {

        let ok = await this.#checkConfig(newData);

        if(!ok) throw new FieldRestrictionError("Some data don't respect the field constraints you specified when you created this model.")

        const oldData = await this.fetchOne(lookupValue,lookup);

        /**@type {object} */
        const updatedData = {...oldData,...newData};

        /**@type {Array} */
        const allRecords = await this.fetchAll();

        let idx = allRecords.findIndex( record => record?.id === oldData?.id)

        if(idx === -1) return;
        
        /*** RESAVE THE UPDATED DATA TO DATABASE */
        allRecords.splice(
            idx,1,!this.autoUpdateDate ? updatedData : {
                ...updatedData,
                last_update: new Date()
            } 
        )

        await writeFile(this.resolveFilePath(),JSON.stringify(allRecords),{encoding:this.encoding});

        return updatedData;
    }

    /**
     * 
     * @param {Array} data 
     * @param {Function} cb
     * 
     * Updates many records at the same time. Pass as an argument a list 
     * containing objects representing records to update.
     * Each object has a property [ id ] which is the id of the record to update
     * and a property [ data ] which is the new data.
     * 
     * The user can filter data they want to update.
     * 
     */
    async updateMany(data,cb) {

        /**@type {array} */
        const _allRecords = await this.fetchAll();
        const toUpdateData = cb ? cb(_allRecords) : _allRecords;

        data.map( d => {

            let id = parseInt(d.id);
            
            if(!isNaN(id)) {

                let nData = d.data;

                /*** Get record with this id from the database */
                const foundRecord = allRecords.find( record => record.id === id );
                
                /*** Constitute updated data for each record */
                const upData = {...foundRecord,...nData};
    
                /*** Find its index */
                let idx = toUpdateData.indexOf(foundRecord);

                /*** Replace the oldData with the up to date data */
                toUpdateData.splice(idx,1,!this.autoUpdateDate ? upData : {
                    ...upData,
                    last_update: new Date()
                } );
            }
        })

        await writeFile(this.resolveFilePath(),JSON.stringify(toUpdateData),{encoding:this.encoding})
        
    }

    get typesFilePath() {
        let fullPath = join(
            this.modelFilePath,this.#tsDir,`${this.modelName}.txt`
        );

        return fullPath;
    }

    get configFilePath() {
        let fullPath = join(
            this.modelFilePath,this.#configDir,`${this.modelName}.txt`
        );

        return fullPath;
    }

    get diaryFilePath() {
        let fullPath = join(
            this.modelFilePath,this.#configDir,`fields-diary.json`
        )

        return fullPath;
    }

    /**
     * 
     * @returns {object | Array}
     * 
     * Reads the content of the file that keeps tracks of different information about fields.
     */
    async getFieldDiaryContent() {
        /**@type {object} */
        const fieldDiaryContent = await readFile(this.diaryFilePath,{encoding:"utf-8"});
        const parsedContent = JSON.parse(fieldDiaryContent || "{}");

        return parsedContent;
    }


    /**
     * 
     * @param {object} options
     * @param {any} options.lookupValue
     * @param {string} options.lookup 
     * @returns {Array}
     * 
     * Gets one record from database a returns it (to be used methods such as [ this.fetchOne ] and [ this.deleteOne ]).
     * Implemented to abstract a redundant piece of code.
     * 
     */
    async getObject({lookupValue,lookup}) {

        let lkpV = lookupValue;
        let lkp = lookup;

        if(lookup === "id") {

            let parsed = parseInt(lookupValue);

            if(isNaN(parsed)) throw new TypeError("Couldn't parse the id lookup value. It should be a number.")

            lkpV = parsed;
            lkp = lookup;
                
        }
        /**@type {array} */
        const allRecords = await this.fetchAll();

        const foundRecord = allRecords.find( record => {
            return record[lkp] === lkpV;
        })

        return foundRecord;
    }
}