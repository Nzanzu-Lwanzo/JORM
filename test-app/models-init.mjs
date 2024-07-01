import JORMFieldConstraint from "../jorm-db/jorm-field-constraints.mjs";
import Task from "./tasks/model.mjs";
import User from "./users/model.mjs";
import Category from "./categories/model.mjs";

try {

    Promise.all([

        // Creates the Task model and a "tasks.json" file under "../db-files/";
        Task.model(),

        // Creates the User model and a "users.json" file under "../db-files/";
        User.model(),

        // Create the Category model (only for testing purposes)
        Category.model()

    ]).then( async _ => {

        // DEFINE ASSOCIATIONS HERE 

        await User.oneToMany(Task,{
            fieldConstraints : {
                allowNull : true
            }
        })

        await Task.manyToMany(Category);
        
    })

} catch(e) {

    console.log(e)

    console.log(
        "Error : couldn't create the models and respectively their related files and directories."
    )

}
