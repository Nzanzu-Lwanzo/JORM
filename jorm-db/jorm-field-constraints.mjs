import { FieldRestrictionError, ModelTypeError } from "./jorm-errors.mjs";
import {
    ENUMValuesAreSameType
} from "./jorm-utils.mjs";


export default class JORMFieldConstraint {

    #validateInstance = () => {

        /*** Force the conversion of the allowNull option */
        this.options.allowNull = Boolean(this.allowNull);
        this.options.unique = Boolean(this.unique);

        /*** STRING */
        if(this.isMail && typeof this.isMail !== "boolean") {
            throw new ModelTypeError("[ string.isMail ] option should be a boolean.")
        }

        if(this.isURL && typeof this.isURL !== "boolean") {
            throw new ModelTypeError("[ string.isURL ] option should be a boolean.")
        }

        if(this.stringMaxLength && isNaN(parseInt(this.stringMaxLength))) {
            throw new ModelTypeError("[ maxLength ] should be an integer.")
        }

        if(this.stringMinLength && isNaN(parseInt(this.stringMinLength))) {
            throw new ModelTypeError(" [ minLength ] should be an integer.")
        }

        if(
            this.string_in && 
            (!Array.isArray(this.string_in) ||  this.string_in.length === 0)
        ) {
            throw new ModelTypeError(" [ string_in ] should be an array containing at least one value.")
        }

        if(
            this.string_none && 
            (!Array.isArray(this.string_none) || this.string_none.length === 0)
        ) {
            throw new ModelTypeError(" [ string_none ] should be an array containing at least one value.")
        }


        /*** ARRAY */

        if(this.arrayMaxLength && isNaN(parseInt(this.arrayMaxLength))) {
            throw new ModelTypeError("[ maxLength ] should be an integer.")
        }

        if(this.arrayMinLength && isNaN(parseInt(this.arrayMinLength))) {
            throw new ModelTypeError("[ minLength ] should be an integer.")
        }

        if(this.numberMax && isNaN(parseInt(this.numberMax))) {
            throw new ModelTypeError("[ max ] should be an integer.")
        }

        if(this.numberMin && isNaN(parseInt(this.numberMin))) {
            throw new ModelTypeError("[ min ] should be an integer.")
        }


        return true;
    }

    /**
     * 
     * @param {object} options
     * @param {boolean} options.allowNull
     * @param {any} options.defaultValue;
     * @param {boolean} options.unique;
     * 
     * @param {object} options.string;
     * @param {number} options.string.minLength
     * @param {number} options.string.maxLength
     * @param {boolean} options.string.isMail
     * @param {boolean} options.string.isURL
     * @param {string} options.string.startsWith
     * @param {string} options.string.endsWith
     * @param {string} options.string.contains
     * @param {boolean} options.string.iCase
     * @param {[string]} options.string.in
     * @param {[string]} options.string.none
     * 
     * @param {object} options.number
     * @param {number} options.number.min
     * @param {number} options.number.max
     * @param {[number]} options.number.in
     * @param {[number]} options.number.none
     * @param {number} options.number.gte
     * @param {number} options.number.lte
     * @param {number} options.number.gt
     * @param {number} options.number.lt
     * 
     * @param {object} options.array
     * @param {number} options.array.maxLength
     * @param {number} options.array.minLength
     * 
     * 
     * Builds a field constraint object for a JORM model.
     */
    constructor(options={
        allowNull:true,
        defaultValue:undefined,
        unique : false,
        string : {
            minLength:undefined,
            maxLength:undefined,
            isMail:undefined,
            isURL:undefined,
            startsWith: undefined,
            endsWith: undefined,
            contains: undefined,
            iCase : undefined,
            in: [],
            none: []
        },
        number : {
            min:undefined,
            max:undefined,
            in: [],
            none: [],
            gte : undefined,
            lte : undefined,
            gt : undefined,
            lt : undefined
        },
        array : {
            minLength : undefined,
            maxLength : undefined
        }
    }) {

        this.options = options;

        this.allowNull = options?.allowNull;
        this.defaultValue = options?.defaultValue;
        this.unique = options?.unique;

        this.stringMaxLength = options?.string?.maxLength;
        this.stringMinLength = options?.string?.minLength;
        this.isMail = options?.string?.isMail;
        this.isURL = options?.string?.isURL;
        this.string_startsWith = options?.string?.startsWith;
        this.string_endsWith = options?.string?.endsWith;
        this.string_contains = options?.string?.contains;
        this.iCase = options?.string?.iCase;
        this.string_in = options?.string?.in;
        this.string_none = options?.string?.none;

        this.numberMin = options?.number?.min;
        this.numberMax = options?.number?.max;

        this.arrayMaxLength = options?.array?.maxLength
        this.arrayMinLength = options?.array?.minLength;
    }

    __class__() {
        return "JORMFieldConstraint";
    }

    /**
     * Returns the constraints object for them to be writtent to the config file.
     */
    get constraints () {
        let ok = this.#validateInstance();
        if(!ok) throw new ModelTypeError("Check the data type you provided for your constraints options.")
        return this.options;
    }


    validate(data) {
       
    }
}