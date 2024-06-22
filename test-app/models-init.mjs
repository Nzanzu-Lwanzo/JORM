import Task from "./tasks/model.mjs";
import User from "./users/model.mjs";

try {

    // Creates the Task model and a "tasks.json" file under "../db-files/";
    await Task.model();

    // Creates the User model and a "users.json" file under "../db-files/";
    await User.model();

} catch(e) {

    console.log(
        "Error : couldn't create the models and respectively their related files and directories."
    )

}
