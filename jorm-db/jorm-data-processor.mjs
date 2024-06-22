import JORM from "./jorm-model.mjs";

import {
    DataProcessingError
} from "./jorm-errors.mjs";

export default class DataProcessor {

    /** @param { Array | object} data */
    #save = (data) => this.dataValue = Array.isArray(data) ? data : [data];

    /**
     * @param {JORM} instance
     * 
     */
    constructor(instance) {
        this.instance = instance
        this.dataValue = []
    }

    /**
     * 
     * @param {object} data 
     * @returns {DataProcessor}
     * 
     * Saves data to process before starting to process it. This method should be the first in the chain.
     * 
     */
    data (data) {
        this.#save(data);
        return this;

    }

    /**
     * 
     * @param {object} options 
     * @param {[string]} options.fields
     * @param {[string] | string} options.order
     * 
     */
    order (options) {
        const fields = options.fields;
        const orders = options.order || ["ASC","NULLS FIRST"];

        if(!fields || fields.length === 0) {
            throw new DataProcessingError("You must specify at least one field to sort by.")
        }

        const sorted = this.dataValue.sort((elt1,elt2) => {
            for(let i = 0; i < fields.length; i++) {

                let field = fields[i];
                let order = Array.isArray(orders) ? orders[i] : orders;

                let comparison;

                if 
                    (elt1[field] > elt2[field]) {comparison = 1}
                else if
                    (elt1[field] < elt2[field]) {comparison = -1}

                if(order==="DESC") {
                    comparison *= -1;
                } else if (
                    order === "NULLS FIRST" && elt1[field] === null && elt2[field] !==null
                ) {
                    comparison = -1;
                } else if (
                    order === "NULLS LAST" && elt1[field] !== null && elt2[field] ===null
                ) {
                    comparison = -1;
                }

                if(comparison !== 0) {
                    return comparison;
                }
            }

            return 0;
        })

        this.dataValue = this.#save(sorted);

        return this;        
    }

    /**
     * 
     * @param {object} options 
     * @param {number} options.limit
     * @param {number} options.offset
     * 
     * @returns {DataProcessor}
     */
    limitAndOffset (options) {

        let limit = options?.limit;
        let offset = options?.offset || 0;

        const processedData = this.dataValue.slice(offset,offset + limit);

        /*** Save the data on this so it can be accessed by other methods in the chain */
        this.dataValue = this.#save(processedData);

        return this;
    }

    /**
     * 
     * @returns {number}
     * 
     * The returned value is final. No other method can be chained on this.
     */
    count () { 
        return this.dataValue.length
    }


    /**
     * @param {object} options
     * @param {string} options.field
     * @param {boolean} options.accountForNulls
     * @returns {number}
     * 
     * The returned value is final. No other method can be chained on this.
     */
    avg ({field,accountForNulls=false}) {
        
        /**@type {Array} */
        let countRecordWithData = 0;

        const data = this.dataValue.map( record => {
            if(typeof record[field] !== "number") return 0;
            if(!record[field]) return 0;

            /*** 
             * Count the records that had valid data.
             * This is the value we will use in the calculation of the average
             * Instead of using the length of [ data ]
             */

            countRecordWithData++;

            return record[field]
        })

        /***
         * If the user wants to consider the records which had null value
         * in the calculation of the average, then we'll use the length of the data array
         * */
        let avgWith = accountForNulls ? data.length : countRecordWithData;

        let sum = 0;

        data.forEach( n => sum+=n );
        
        return sum / avgWith;

    }

    /**
     * @param {string} field
     * 
     * @returns {number}
     * 
     * The returned value is final. No other method can be chained on this.
     * Returns the biggest value of a set of numerical values.
     */
    max (field)  {

        const data = this.getNumericalFields(this.dataValue,field);
        return Math.max(...data);

    }

    /**
     * @param {string} field
     * 
     * @returns {number}
     * 
     * The returned value is final. No other method can be chained on this.
     * Returns the smallest value of a set of numerical values.
     * 
     */
    min (field) {
        const data = this.getNumericalFields(this.dataValue,field);
        return Math.min(...data);
    }

    /**
     * @param {Function} cb
     * @returns {DataProcessor}
     * 
     * Performs a custom processing on the data. The returned value of the callback must not be a promise.
     * 
     */
    custom(cb) {

        /**@type {Array} */
        const data = this.dataValue;

        const processedData = cb(data);

        this.#save(processedData);

        return this;
    }

    /**
     * 
     * @param {Array} data 
     * @param {string} field 
     * @returns {Array}
     *     
     */
    getNumericalFields(data,field) {

        const numFields = data.map( record => {
            if(typeof record[field] !== "number") return 0;
            if(!record[field]) return 0;

            return record[field];
        })

        return numFields;

    }

}
