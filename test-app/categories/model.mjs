import JORM from "../../jorm-db/jorm-model.mjs";
import {join, dirname} from "node:path";
import { fileURLToPath } from "node:url";
import JORMFieldConstraint from "../../jorm-db/jorm-field-constraints.mjs";

const db = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../db-files"
)

const Category = new JORM({
    model : {
        modelFilePath : db,
        modelName : "categ",
        modelShape : {
            name : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : false,
                    unique : true,
                    string : {
                        maxLength : 10
                    }
                })
            },
            color : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : false,
                    unique : true,
                    string : {
                        maxLength : 7
                    }
                })
            }
        }
    },
    options : {
        eagerLoading : true
    }
})

export default Category;