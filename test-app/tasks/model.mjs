import JORM from "../../jorm-db/jorm-model.mjs";
import {join, dirname} from "node:path";
import { fileURLToPath } from "node:url";
import JORMFieldConstraint from "../../jorm-db/jorm-field-constraints.mjs";


const db = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../db-files"
)

const Task = new JORM({
    model : {
        modelFilePath : db,
        modelName : "task",
        modelShape : {
            name : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : false,
                    string : { maxLength : 50 },
                })
            },
            description : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : true,
                    defaultValue : "There's no description for this task !",
                })
            },
            date : {
                type : "string",
                config : new JORMFieldConstraint({
                    allowNull : false,
                    date : {
                        isAfter : new Date()
                    }
                })
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

export default Task;