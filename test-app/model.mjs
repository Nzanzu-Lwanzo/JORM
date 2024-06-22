import JORM from "../jorm-db/jorm-model.mjs";
import {join, dirname} from "node:path";
import { fileURLToPath } from "node:url";
import JORMFieldConstraint from "../jorm-db/jorm-field-constraints.mjs";


const db = join(
    dirname(fileURLToPath(import.meta.url)),
    "../db-files"
)

const User = new JORM({
    model : {
        modelFilePath : db,
        modelName : "task",
        modelShape : {
            name : {
                type : "string",
                config : new JORMFieldConstraint({ allowNull : false })
            },
            description : {
                type : "string",
                config : new JORMFieldConstraint({ allowNull : true })
            },
            date : {
                type : "string",
                config : new JORMFieldConstraint({ allowNull : false })
            }
        }
    },
    options : {
        autoCreateDate: true,
        autoUpdateDate : true,
        coercicion : true,
        plurify : true
    }
})

// Creates the user model and a "users.json" file under "../db-files/"
User.model();

export default User;