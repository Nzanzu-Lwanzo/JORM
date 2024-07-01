import { userForm, userContainer, loader, userFormBtn, allUsersContainer } from "./elements.js";
import { buildUser, mutation, query, lsDelete, lsWrite, lsRead } from "./utilities.js";

query("http://localhost:3000/api/jorm/user/")
    .then( 
        
        /**@param {Array} data */
        (data) => {

        /****Save to localStorage to easily handle updates */
        lsWrite("users",data);
    
        let allUsers="";

        data.reverse().forEach( user => allUsers += buildUser(user));

        userContainer.innerHTML = "";
        userContainer.innerHTML = allUsers;
        
        
    })
    .catch( e => console.log(e.message))


userForm.addEventListener("submit",function(e) {

    e.preventDefault();

    let prevText = userFormBtn.innerHTML;
    userFormBtn.innerHTML = loader;

    const DATA = new FormData(userForm);

    const data = {
        username : DATA.get("username"),
        bio : DATA.get("bio")
    }

    mutation("http://localhost:3000/api/jorm/user/","POST",data)
        .then( data => {

            const allUsers = userContainer.innerHTML;
            const user = buildUser(data);

            userContainer.innerHTML = user + allUsers;

            userForm.classList.remove("all-screen-form-shown");
            allUsersContainer.classList.add("shown");
            userForm.reset();

            /*** Save to localstorage to facilitating update handling */
            lsWrite("users",user);

        })
        .catch( err => console.log(err))
        .finally( _ => userFormBtn.innerHTML = prevText);
        
})

