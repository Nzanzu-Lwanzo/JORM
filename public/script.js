import { showForm,hideForm,form } from "./elements.js";

import { 
    userForm,
    showUserFormBtn,
    hideUserFormBtn,
    showAllUsers,
    allUsersContainer,
    hideAllUsers
} from "./elements.js";

showForm?.addEventListener("click",(e) => {

    e.preventDefault();

    form?.classList.add("shown");

})

hideForm?.addEventListener("click",(e) => {

    e.preventDefault();

    form?.classList.remove("shown");
})

showUserFormBtn.addEventListener("click",function(e){

    e.preventDefault();
    userForm.classList.add("all-screen-form-shown");

})

hideUserFormBtn.addEventListener("click",function(e){

    e.preventDefault();
    userForm.classList.remove("all-screen-form-shown");

})

showAllUsers.addEventListener("click",function(e){

    e.preventDefault();
    allUsersContainer.classList.add("shown");

})

hideAllUsers.addEventListener("click",function(e){

    e.preventDefault();
    allUsersContainer.classList.remove("shown");

})