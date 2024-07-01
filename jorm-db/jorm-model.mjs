import {
    writeFile,
    readFile,
    unlink
} from "node:fs/promises";

import { existsSync, statSync } from "node:fs";

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
    getShape,
    getConfig,
    createStorageDir,
    storeToDir,
    buildRecord,
    addAssociationField
} from "./jorm-utils.mjs";

import { DIARY_CONFIG } from "./jorm-constants.mjs";

import DataProcessor from "./jorm-data-processor.mjs";

import checkFieldConfig from "./jorm-field-config-checks.mjs";

import checkFieldType from "./jorm-field-types-checks.mjs";
import validator from "validator";

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
     * Store the types of this particular model [ table, Json File ] in a utf-8 encoded [ .txt ] file.
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
    #checkTypes = async (newData) => await checkFieldType({instance:this,newData})

    #checkConfig = async (newData,isUpdate) => {
        return await checkFieldConfig({instance:this,newData},isUpdate)
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
     * @param {boolean} JORMConstructor.options.eagerLoading
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
            plurify : true,
            eagerLoading : false
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
        this.encoding = options.encoding || "utf-8";
        this.plurify = options.plurify
        this.eagerLoading = options.eagerLoading

        this.pathIsFile = statSync(this.modelFilePath).isFile();
        
    }

    __class__() {
        return "JORM"
    }

    __name__() {
        return this.modelName?.toLowerCase() || "no-model-name"
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
            filePath = join(this.modelFilePath,`${this.modelName}${this.plurify ? "s" : ""}.json`);
        }

        return filePath;
    }


    /**
     * 
     * @param {Function} cb
     * @param {object} relation
     * @param {boolean} relation.eager
     * @param {[JORM]} relation.models
     * @param {boolean} raw
     * 
     * @returns {Promise<object|string>}
     * 
     * Fetches all the records from the table [ Json File ].
     * If the [ raw ] option is set to true, then the Json data won't be parsed before being returned.
     * 
     */
    async fetchAll (
        cb,
        relation= {
            eager : this.eagerLoading,
            models : undefined
        },
        raw=this.raw) {

        if(!this.resolveFilePath()) throw new BadFilePathError("We couldn't find the path to you Json Database File.");

        /**@type {string} */
        const jsonData = await readFile(this.resolveFilePath(),{encoding:"utf-8"});

        if(raw) return new Promise.resolve(jsonData);

        /**@type {Array} */
        let allRecords = cb ? cb(JSON.parse(jsonData || "[]")) : JSON.parse(jsonData || "[]");

        if(relation.eager && relation.models.length !== 0) {

            // Get all the ref field names
            const refFieldNames = relation.models.map( model => {
                return this.getRefFieldName(undefined,model);
            })

            // Get the data with
            const dataByEagerLoading = allRecords.map( async record =>{

                const dettachedRealtedData = relation.models.map( async model => {

                    try {
                        let refFieldName = this.getRefFieldName(undefined,model);
                        
                        const data = await model.fetchOne(record[refFieldName]);

                        /*** The reference field that ends with _id */
                        delete record[refFieldName];
                        
                        return {...record,[model.__name__()] : data};

                    } catch(e) {
                        if(e instanceof TypeError) {
                            return record;
                        }

                        throw new e;
                    }
                })

                const updatedRecord = await (await Promise.all(dettachedRealtedData)).reduce(
                    /**
                     * 
                     * @param {object} prev 
                     * @param {object} curr 
                     * @param {number} idx 
                     * @param {Array} array 
                     * @returns 
                     */
                    (prev,curr,idx,array) => {
                        Object.keys(curr).forEach( key => {
                            if(refFieldNames.includes(key)) { delete curr[key] }
                        })

                        return {...prev,...curr}
                    }
                )

                return updatedRecord;

            })

            return await Promise.all(dataByEagerLoading)

        }

        return allRecords;


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
     * @returns {Promise<object|string> | null}
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

        if(!foundRecord) return null
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
     * @returns {Promise<Array>}
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
     * @returns {Promise<Array>}
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
     * @param {void}
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

        /*** Delete all the stored ids */
        const parsedDiaryContent = await this.getFieldDiaryContent();
        await writeFile(
            this.diaryFilePath,
            JSON.stringify({...parsedDiaryContent,exist_ids:[]}),
            {encoding:this.encoding}
        )
    }


    /**
     * @param {any} lookupValue
     * @param {Function} cb
     * @param {string} lookup
     * 
     * @returns {Promise<boolean>}
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
             * @param {Array}
             * 
             * Receives an array containing the deleted records.
             */
            cb(deleted);
        }

        await writeFile(this.resolveFilePath(),JSON.stringify(allRecords),{encoding:this.encoding});

        /*** Delete the id of this deleted record from the ids store */
        const parsedDiaryContent = await this.getFieldDiaryContent();

        /**@type {Array} */
        const exist_ids = parsedDiaryContent?.exist_ids;
        let id_idx = exist_ids.findIndex( id => id === deleted[0]?.id );
        exist_ids.splice(id_idx,1);
        await writeFile(
            this.diaryFilePath,
            JSON.stringify({...parsedDiaryContent,exist_ids}),
            {encoding:this.encoding}
        )

        return true;
    }

    /**
     * 
     * @param {string} field
     * @param {Array} data
     * @param {Function} cb
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
     * @param {object} mtm
     * @param {JORM} mtm.model
     * @param {number} mtm.tid
     * 
     * @returns {Promise<object|Error>}
     * 
     * Creates a JORM record but don't save it into the table [ Json File ].
     * This record is returned with a computed primary key value up to date.
     * 
     * By default, a [ create_date ] field is added to each table
     * unless the [ autoCreateDate ] constructor option is set to false.
     */
    async record (data,mtm={model:undefined,tid:undefined}) {

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
                const parsedDiaryContent = await this.getFieldDiaryContent();

                if(lastId) {
                    /*** There's no last id, that means there was no record in the file. */
                    /*** If so, read the id from the file */
                    id = lastId+1

                } else {
                    let last_id = parsedDiaryContent.last_id || 0;
                    id = last_id + 1;
                }    
    
                /*** FORM THE NEW RECORD */
                const  builtRecord = await buildRecord(data,this.configFilePath);
                const newRecord = {id,...builtRecord};  

                if(this.autoCreateDate) {
                    newRecord.created_at = new Date();
                } 
                            
                
                return {
                    data : newRecord,
                    save : async () => {

                        /*** WRITE THE NEW LAST_ID BACK TO THE FILE */

                        await writeFile(
                            this.diaryFilePath,
                            JSON.stringify({...parsedDiaryContent,last_id:id}
                        ))

                        /*** SAVE THE RECORD TO THE DATABASE */
                    
                        const freshData = [...parsedFileContent,newRecord];
                        await writeFile(this.resolveFilePath(),JSON.stringify(freshData),{encoding:this.encoding});

                        /*** STORE THE ID OF THIS NEWLY CREATED DATA */

                        /**@type {Array} */
                        const exist_ids = parsedDiaryContent?.exist_ids || [];
                        exist_ids.push(id)
                        await writeFile(
                            this.diaryFilePath,
                            JSON.stringify({...parsedDiaryContent,exist_ids}),
                            {encoding:this.encoding}
                        )
                        
                        /*** IF IT'S A MANY TO MANY RELATIONSHIP */

                        if(mtm.model && mtm.tid) {

                            await this.createMtm(mtm.model,{
                                fid:newRecord.id,
                                tid:mtm.tid
                            })

                        }

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
     * @param {object} mtm
     * @param {JORM} mtm.model
     * @param {number} mtm.tid
     
     * @returns {Promise<object>|Error}
     * 
     * Creates a JORM record and directly saves it into the database [ Json File ].
     * 
     * By default, a [ create_date ] field is added to each table
     * unless the [ autoCreateDate ] constructor option is set to false.
     */
    async create (data,mtm={model:undefined,tid:undefined}) {

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
                const parsedDiaryContent = await this.getFieldDiaryContent();

                if(lastId) {
                    /*** There's no last id, that means there was no record in the file. */
                    /*** If so, read the id from the file */
                    id = lastId+1

                } else {
                    let last_id = parsedDiaryContent.last_id || 0;
                    id = last_id + 1;
                }

                /*** WRITE THE NEW LAST_ID BACK TO THE FILE */
                await writeFile(
                    this.diaryFilePath,
                    JSON.stringify({...parsedDiaryContent,last_id:id}
                ))
    
                /*** FORM THE NEW RECORD */
                const  builtRecord = await buildRecord(data,this.configFilePath);
                
                const newRecord = {id,...builtRecord};

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

                /*** STORE THE ID OF THIS NEWLY CREATED DATA */

                /**@type {Array} */
                const exist_ids = parsedDiaryContent?.exist_ids || [];
                exist_ids.push(id)
                await writeFile(
                    this.diaryFilePath,
                    JSON.stringify({...parsedDiaryContent,exist_ids}),
                    {encoding:this.encoding}
                )

                
                /*** IF IT'S A MANY TO MANY RELATIONSHIP */
                if(mtm.model && mtm.tid) {

                    await this.createMtm(mtm.model,{
                        fid:newRecord.id,
                        tid:mtm.tid
                    })

                }

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
     * @returns {Promise<object|undefined|FieldRestrictionError>}
     * 
     * Updates one record. 
     * It's advisable to use this function inside of a  [ .then() ] statement after calling 
     * [ this.fetchOne() ] which returns an instance fetched from the table [ Json File ].
     */
    async updateOne ({lookupValue,lookup=this.lookup},newData) {

        let ok = await this.#checkConfig(newData,true);

        if(!ok) throw new FieldRestrictionError("Some data don't respect the field constraints you specified when you created this model.")

        const oldData = await this.fetchOne(lookupValue,lookup);

        /**@type {object} */
        const updatedData = {...oldData,...newData};
        
        console.log(updatedData)

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
     * @returns {Promise<Array>}
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

        await writeFile(this.resolveFilePath(),JSON.stringify(toUpdateData),{encoding:this.encoding});

        return toUpdateData;
        
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
            this.modelFilePath,this.#configDir,`${this.modelName}-fields-diary.json`
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

    /**
     * 
     * @param {string} name 
     * @param {JORM} model
     * 
     * @returns {string}
     */
    getRefFieldName (name,model) {

        let field;

        if(!name) return `${model.__name__().toLowerCase()}_id`;

        if(!validator.contains(name,model.__name__(),{ignoreCase:true})) {
            throw new FieldRestrictionError(`Your reference field name ( currently [ ${name} ] ) should contain [ ${model.__name__()} ]. Case insensitive.`)
        }

        if(!name.toLowerCase().endsWith("_id")) {

            field = `${name}_id`.toLowerCase()

        } else { field = name.toLowerCase() }

        return field;

    }

    /**
     * 
     * @param {JORM} model 
     */
    createJunctionTable (model) {

       

    }

    
    /**
     * 
     * @param {string} with_model_name 
     * 
     * @returns {string}
     * 
     * Receives the name of the model with which this model is having an association.
     */
    getJunctionTablePath (with_model_name) {

        const junctionTablePath = join(
            this.modelFilePath,
            `${this.getJunctionTableName(with_model_name)}.json`
        ) 

        return junctionTablePath;
    }


    /**
     * 
     * @param {string} with_model_name 
     * @returns {string}
     */
    getJunctionTableName (with_model_name) {
        return `/${this.__name__().toLowerCase()}s-${with_model_name.toLowerCase()}s`;
    }

    /**
     * 
     * @param {string} with_model_name 
     * @returns {string}
     */
    getJunctionTableConfigFilePath (with_model_name) {

        return join(
            this.modelFilePath,
            this.#configDir,
            `${this.getJunctionTableName(with_model_name)}.txt`
        )
    }

    /**
     * 
     * @param {string} with_model_name 
     * @returns {string}
     */
    getJunctionTableTypesFilePath (with_model_name) {
        return join(
            this.modelFilePath,
            this.#tsDir,
            `${this.getJunctionTableName(with_model_name)}.txt`
        )
    }

    /**
     * 
     * @param {[string]} models 
     */
    getJunctionTableDiaryFilePath(models) {
        let fullPath = join(
            this.modelFilePath,this.#configDir,`${models[0]}-${models[1]}-fields-diary.json`
        )

        return fullPath;
    }

    /**
     * 
     * @param {JORM} model 
     * @returns {object}
     */
    async getJunctionTableDiaryContent(model) {

        const junctionTableFilePath = this.getJunctionTableDiaryFilePath([
            this.__name__(),
            model.__name__()
        ]);

        const diaryFileContent = await readFile(junctionTableFilePath,{encoding : this.encoding})

        const parsedDiaryContent = JSON.parse(diaryFileContent || "{}");

        return parsedDiaryContent;
    }


    // ASSOCIATIONS



    /**
     * 
     * @param {JORM} model 
     * @param {object} options 
     * 
     * @param {object} options.fromModel
     * 
     * @param {string} options.fromModel.name
     * @param {object} options.fromModel.on
     * @param {string} options.fromModel.on._delete
     * @param {string} options.fromModel.on._update
     * @param {object} options.fromModel.fieldConstraints
     * @param {boolean} options.fromModel.fieldConstraints.allowNull
     * @param {any} options.fromModel.fieldConstraints.defaultValue
     *  
     * @param {object} options.toModel
     * 
     * @param {string} options.toModel.name
     * @param {object} options.toModel.on
     * @param {string} options.toModel.on._delete
     * @param {string} options.toModel.on._update
     * @param {object} options.toModel.fieldConstraints
     * @param {boolean} options.toModel.fieldConstraints.allowNull
     * @param {any} options.toModel.fieldConstraints.defaultValue
     * 
     * Establishes a one-to-one relationship between the two models
     * by adding a reference field on the two tables. Only the id can be used.
     * 
     */
    oneToOne(model,options={
        fromModel : {
            name : undefined,
            on : {
                _delete : undefined,
                _update : undefined
            },
            fieldConstraints : {
                allowNull : false,
                defaultValue : undefined
            }
        },
        toModel : {
            name : undefined,
            on : {
                _delete : undefined,
                _update : undefined
            },
            fieldConstraints : {
                allowNull : true,
                defaultValue : undefined
            }
        }
    })  {

        let from_model_field = options.fromModel.name;
        let to_model_field = options.toModel.name;

        // CREATE A FIELD ON THE TWO MODELS
        addAssociationField({
            configFilePath : this.configFilePath,
            typesFilePath : this.typesFilePath,
            name : this.getRefFieldName(from_model_field,model),
            fieldConstraints : {...options.fromModel.fieldConstraints,unique:true}
        })

        addAssociationField({
            configFilePath : model.configFilePath,
            typesFilePath : model.typesFilePath,
            name : this.getRefFieldName(to_model_field,this),
            fieldConstraints : {...options.toModel.fieldConstraints,unique:true}
        })

        /**
         * Unique is true on the association because in oneToOne relationships 
         * one record of A should be associated to at most one record of B, 
         * A and B being tables (models, Json Files).
         * 
         * Remove the spreading operator and the unique property at the end,
         * if not the case.
         * 
         */

        
    }


    
    /**
     * 
     * @param {JORM} model 
     * @param {object} options 
     * @param {string} options.name
     * 
     * @param {object} options.on
     * @param {string} options.on._delete
     * @param {string} options.on._update
     * 
     * @param {object} options.fieldConstraints
     * @param {boolean} options.fieldConstraints.allowNull
     * @param {any} options.fieldConstraints.defaultValue
     * 
     * Establishes a one-to-many relationship between the two models
     * by adding a reference field on the target table. Only the id can be used.
     * 
     */
    async oneToMany (model,options={
        name : undefined,
        on : {
            _delete : undefined,
            _update : undefined
        },
        fieldConstraints : {
            allowNull : true,
            defaultValue : undefined
        }
    }) {

        // CREATE A REFERENCE FIELD ON THE TARGET TABLE
        await addAssociationField({
            configFilePath : model.configFilePath,
            typesFilePath : model.typesFilePath,
            name : this.getRefFieldName(options.name,this),
            fieldConstraints : {...options.fieldConstraints,unique:false}
        })

        /**
         * Be given two tables : students and courses.
         * If we want to establish a one-to-many relationship between them 
         * such as one course can have many students attending, then the student_id
         * on the courses tables can't have unique value.
         */

    } 


    /**
     * 
     * @param {JORM} model 
     * @param {object} through
     * 
     * @param {object} through.from_model_field
     * @param {object} through.from_model_field.on
     * @param {string} through.from_model_field.on._delete
     * @param {string} through.from_model_field.on._update
     * @param {object} through.from_model_field.fieldConstraints
     * @param {boolean} through.from_model_field.fieldConstraints.allowNull
     * @param {any} through.from_model_field.fieldConstraints.defaultValue
     * @param {boolean} through.from_model_field.fieldConstraints.unique
     * 
     * 
     * @param {object} through.to_model_field
     * @param {object} through.to_model_field.on
     * @param {string} through.to_model_field.on._delete
     * @param {string} through.to_model_field.on._update
     * @param {object} through.to_model_field.fieldConstraints
     * @param {boolean} through.to_model_field.fieldConstraints.allowNull
     * @param {any} through.to_model_field.fieldConstraints.defaultValue
     * @param {boolean} through.to_model_field.fieldConstraints.unique
     * 
     * Establishes a many-to-many relationship between the two models
     * by creating an junction table that contains three properties :
     * a [ id ] primary key and two properties pointing to the two models id.
     * 
     */
    async manyToMany(model,through = {
        from_model_field : {
            on : {
                _delete : undefined,
                _update : undefined
            },
            fieldConstraints : {
                allowNull : true,
                defaultValue : undefined,
                unique : false
            }
        },

        to_model_field : {
            on : {
                _delete : undefined,
                _update : undefined
            },
            fieldConstraints : {
                allowNull : true,
                defaultValue : undefined,
                unique : false
            }
        }
    }) {

        // CREATE THE JUNCTION TABLE [ Json File ]
        await writeFile(
            this.getJunctionTablePath(model.__name__()),
            JSON.stringify([]),
            {
                encoding:this.encoding
            }
        );

        // CREATE THE FILE THAT HOLDS THE FIELDS RESTRICTIONS AND TYPES

        let config = {

            [`${this.__name__()}_id`] : {
                ... through.from_model_field?.fieldConstraints
            },
            [`${model.__name__()}_id`] : {
                ... through.to_model_field?.fieldConstraints
            }
        }

        let types = {
            [`${this.__name__()}_id`] : "number",
            [`${model.__name__()}_id`] : "number"
        }

        // CONFIG FILE
        await writeFile(
          this.getJunctionTableConfigFilePath(model.__name__()),
          JSON.stringify(config),
          {encoding:this.encoding}
        )

        // TYPES FILE
        await writeFile(
            this.getJunctionTableTypesFilePath(model.__name__()),
            JSON.stringify(types),
            {encoding:this.encoding}
        )

        // DIARY FILE 
        await writeFile(
            this.getJunctionTableDiaryFilePath([this.__name__(),model.__name__()]),
            JSON.stringify(DIARY_CONFIG),
            {encoding:this.encoding}
        );
        
    }

    /**
     * 
     * @param {JORM} model
     * @param {object} options
     * @param {number} options.fid 
     * @param {number} options.tid 
     */
    async createMtm (model,{fid,tid}) {

        if(
            !isNaN(parseInt(fid)) && !isNaN(parseInt(tid))
        ) throw new FieldRestrictionError("The ids must be numerical values.")
        
        try {

            const mtmFileContent = await readFile(
                this.getJunctionTablePath(model.__name__()),
                {encoding : this.encoding}
            )

            /**@type {Array} */
            const allMtmRecords = JSON.parse(mtmFileContent || "[]");
            
            /*** GET THE ID */

            /**@type {object} */
            const lastRecord = allMtmRecords.at(-1);
            let lastId = lastRecord?.id;

            let id;
            const parsedDiaryContent = await this.getJunctionTableDiaryContent(model);

            if(lastId) {
                /*** There's no last id, that means there was no record in the file. */
                /*** If so, read the id from the file */
                id = lastId+1

            } else {
                
                let last_id = parsedDiaryContent.last_id || 0;
                id = last_id + 1;

            }

            /*** WRITE THE NEW LAST_ID BACK TO THE FILE */
            await writeFile(
                this.getJunctionTableDiaryFilePath([
                    this.__name__(),
                    model.__name__()
                ]),
                JSON.stringify({...parsedDiaryContent,last_id:id}
            ))


            /*** FORM THE NEW RECORD */
            const  builtRecord = {
                [this.getRefFieldName(undefined,this)] : parseInt(fid),
                [this.getRefFieldName(undefined,model)] : parseInt(tid)
            };

            const newRecord = {id,...builtRecord};

            /*** RECONSTITUTE THE OBJECT */
            const freshData = [...allMtmRecords,newRecord];

            /*** WRITE BACK TO THE FILE */
            await writeFile(
                this.getJunctionTablePath(),
                JSON.stringify(freshData),
                {encoding:this.encoding}
            );

            return newRecord

        } catch(e) {
           const error = new Error(e.message);
           error.stack = e.stack;

           throw error;
        }

    }


}