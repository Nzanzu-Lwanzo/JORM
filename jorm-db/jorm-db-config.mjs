
export default class JORM {

    /**
     * @constructor 
     * @param {object} options 
     * @param {string | undefined} options.models
     * @param {string | undefined} options.types
     * @param {string | undefined} options.fieldsConstraints
     * @param {string | undefined} options.encoding
     */
    constructor(options={
        models : undefined,
        types : undefined,
        fieldsConstraints : undefined,
        encoding : undefined
    }) {
        this.modelFilePath = options.models;
        this.typesStorage = options.types;
        this.fieldsConstraints = options.fieldsConstraints;
        this.encoding = options.encoding;        
    }

    get paths() {
        return options;
    }
}