import JORM from "../../jorm-db/jorm-model.mjs";
import {join, dirname} from "node:path";
import { fileURLToPath } from "node:url";
import JORMFieldConstraint from "../../jorm-db/jorm-field-constraints.mjs";

const db = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../db-files"
)

/**
 * 
 * Don't store authentication related or sensible data like passwords and credit cards numbers.
 * JORM is not intended for this use case.
 * 
 */
const User = new JORM({
    model :  {
        modelFilePath : db,
        modelName : "user",
        modelShape : {
            username : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : false,
                    string : {
                        maxLength : 16,
                        minLength : 2
                    }
                })
            },
            bio : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : true,
                    defaultValue : "I like JORM as it spares me the headache of configurating a database for small projects I just build for fun."
                })
            }
        }
    }
})


export default User;