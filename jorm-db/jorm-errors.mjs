
export class BadFilePathError extends Error {

    constructor(message)  {

        super(message);
        this.name = "BadFilePathError";
        
    }

}

export class ModelTypeError extends Error {

    constructor(message)  {

        super(message);
        this.name = "ModelTypeError";
        
    }

}

export class FieldRestrictionError extends Error {
    
    constructor(message) {

        super(message);
        this.name = "FieldRestrictionError";
    }
}

export class DataProcessingError extends Error {
    
    constructor(message) {
        super(message)
        this.name = "DataProcessingError";
    }
}