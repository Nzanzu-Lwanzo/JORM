import { 
    query,
    mutation,
    buildTaskCard,
    lsRead,
    lsWrite,
    populateForm,
    getFormData,
    patchHandler,
    postHandler,
    taskCount,
    lsDelete
} from "./utilities.js";

import {
    taskContainer,
    loader,
    form,
    submitBtn,
    deleteAll,
    updateForm,
    updateSubmitBtn,
    hideUpdateFormBtn,
    taskCounter
} from "./elements.js";

// GET ALL
query("http://localhost:3000/api/jorm/task/")
    .then(
        /**@param {Array} data */
        (data) => {

        /****Save to localStorage to easily handle updates */
        lsWrite("tasks",data);
      
        let allTasks="";

        data.reverse().forEach( task => allTasks += buildTaskCard(task));

        taskContainer.innerHTML = "";
        taskContainer.innerHTML = allTasks;

        taskCounter.innerHTML = data.length;

    })
    .catch(e => console.log(e.message))


// POST
form?.addEventListener("submit",postHandler)

// DELETE ALL
deleteAll.addEventListener("click",function (e) {

    e.preventDefault();

    let icon = this.innerHTML;

    this.innerHTML = loader;

    fetch("http://localhost:3000/api/jorm/task/",{
        method:"DELETE",
        headers : {
            "Content-Type":"application/json"
        }
    })
        .then( r => {

            if(r.ok) {
                taskContainer.innerHTML = "You have got no task ! Add some !";
                taskCount(false,true);

                /*** Empty the localStorage */
                lsDelete();

            } else {
                console.log(r)
            }
        })
        .catch( e => console.log(e.message))
        .finally( _ => this.innerHTML = icon);

})


// DELETE ONE
taskContainer.addEventListener("click",function(e) {
    
    e.preventDefault();
    e.stopPropagation();

    if(e.target.matches(".delete-one")) {

        /**@type {HTMLElement} */
        const element = e.target;

        let prevText = element.innerHTML;
        const id = element.getAttribute("data-id");

        element.innerHTML = loader;

        fetch(`http://localhost:3000/api/jorm/task/${id}/`,{
            method : "DELETE",
            headers : {
                "Content-Type" : "application/json"
            }
        })
            .then( r => {
                if(r.status === 204) {

                    document.getElementById(id).remove();
                    taskCount(false);

                    /** Delete this from record from the localStorage */
                    lsDelete(id);
                    
                } else {
                    console.log(r)
                }
            })
            .catch(e => console.log(e.message))
            .finally( _=> element.innerHTML = prevText)

    }

})

// UPDATE ONE

taskContainer.addEventListener("click",function(e) {
    
    e.preventDefault();
    e.stopPropagation();

    if(e.target.matches(".update-form")) {

        /**@type {HTMLElement} */
        const element = e.target;

        let prevText = element.innerHTML;
        const id = element.getAttribute("data-id");

        /*** Fetch this task from localStorage to populate fields */
        const task = lsRead(id);
        populateForm(updateForm,task);

        /*** Show the form */
        updateForm.classList.add("all-screen-form-shown");
    }

})

updateForm?.addEventListener("submit",function(e) {

    e.preventDefault();

    let id = parseInt(this.getAttribute("data-task-id"))

    if(!isNaN(id)) patchHandler(e,parseInt(id));

})

hideUpdateFormBtn.addEventListener("click",(e) => {
    e.preventDefault();
    updateForm.classList.remove("all-screen-form-shown");
})