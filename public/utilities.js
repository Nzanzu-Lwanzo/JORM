import { 
    form,
    submitBtn,
    loader,
    taskContainer,
    updateSubmitBtn,
    updateForm,
    taskCounter,
} from "./elements.js";

/**
 * 
 * @param {string} url
 * 
 * @param {Error | Promise<object>}
 * 
 * [ GET ]
 */
export async function query (url) {
    
    const response = await fetch(url,{
        method : "GET",
        headers : {
            "Content-Type":"application/json"
        }
    })

    if(!response.ok) throw new Error("Bad server response ...")
    
    const data = response.json();
    return data;

}


/**
 * 
 * @param {string} url
 * @param {method} url
 * @param {object} data
 * 
 * @returns {Promise<object>}
 * 
 * [ POST, DELETE, PATCH ]
 */
export async function mutation (url,method,data) {

    const response = await fetch(url,{
        method : method,
        body : JSON.stringify(data),
        headers : {
            "Content-Type" :"application/json"
        }
    })

    if(!response.ok) throw new Error("Bad server response ...");

    return await response.json()
}

/**
 * 
 * @param {object} data 
 * @returns {string}
 */
export function buildTaskCardContent (data) {
    return `
        <h3>
            <span>
                ${data.name || "No task name ..."}
            </span>
            <span class="date">
                [${formatDate(data.date) || "No date ..."}]
            </span>
        </h3>

        ${
            data?.description &&  `${data.description}`
        }


        <div class="actions">
            <button data-id="${data.id}" class="delete-one">
            DELETE
            </button>
            <button data-id="${data.id}" class="update-form">
            EDIT
            </button>
        </div>
    `
}


/**
 * 
 * @param {object} data 
 * @returns {string}
 */
export function buildTaskCard (data) {

    return `<div class="task" id="${data.id}">${buildTaskCardContent(data)}</div>`

}

/**
 * 
 * @param {object} data 
 * @returns {HTMLDivElement}
 */
export function buildTaskCardElt (data) {

    const div = document.createElement("div");
    div.className = "task";
    div.id = data?.id;

    div.innerHTML = buildTaskCardContent(data);

    return div;
}


/**
 * 
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDate (dateString) {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${day}-${month}-${year} | ${hours}:${minutes}`;
}


/**
 * 
 * @param {string} key
 * @param {object | Array} value 
 * 
 * @returns {void}
 */
export const lsWrite = (key,value) => {

    /**@type {Array} */
    const tasks = JSON.parse(localStorage.getItem(key) || "[]");

    if(!tasks || tasks?.length === 0) {

        /*** Value should be an array of objects */
        window.localStorage.setItem(key,JSON.stringify(
            Array.isArray(value) ? value : [value]
        ));

    } else {

        /*** Value should be an object */
        const lkpTask = Array.isArray(value) ? value[0] : value;

        let idx = tasks.findIndex( task => task?.id === lkpTask?.id );

        if(idx === -1) { tasks.push(value) } 
        else { tasks.splice(idx,1,lkpTask) }

        window.localStorage.setItem(key,JSON.stringify(tasks));
    } 
}

/**
 * 
 * @param {undefined | number} lkpV 
 * 
 * @returns {string | object}
 */
export const lsRead = (lkpV) => {
    
    const tasks = window.localStorage.getItem("tasks");

    /**@type {Array} */
    const parsedTasks = JSON.parse(tasks || "[]");

    if(!lkpV) return parsedTasks;

    return parsedTasks.find( task => task?.id === parseInt(lkpV));

}

/**
 * 
 * @param {undefined | number} lkpV 
 */
export const lsDelete = (lkpV) => {

    if(!lkpV) window.localStorage.clear();

    /**@type {Array} */
    const allData = lsRead();
    
    const idx = allData.findIndex( data => data?.id === parseInt(lkpV));

    if(idx === -1) return

    allData.splice(idx,1);

    window.localStorage.setItem("tasks",JSON.stringify(allData));

}


/**
 * @param {HTMLFormElement} form
 * @param {object} task 
 * 
 * @returns {void}
 */
export const populateForm = (form,task) => {

    form.setAttribute("data-task-id",task?.id);
    form.querySelector("input[name]").value = task?.name;
    form.querySelector("textarea").innerHTML = task?.description;

}


/**
 * 
 * @param {HTMLFormElement} form 
 */
export const getFormData = (form) => {
    
    const DATA = new FormData(form);

    const data = {
        name : DATA.get("name"),
        date : DATA.get("date") || new Date(),
        description: DATA.get("description"),
    }

    return data;
} 



export const postHandler = (e) => {

    e.preventDefault();

    const data = getFormData(form);

    submitBtn.innerHTML = loader;

    mutation(
        "http://localhost:3000/api/jorm/task/",
        "POST",
        data
    )
        .then( data => {


            const allTasks = taskContainer.innerHTML;
            const task = buildTaskCard(data);

            taskContainer.innerHTML = task + allTasks;

            form.classList.remove("shown");
            form.reset();

            /*** Save to localstorage to facilitating update handling */
            lsWrite("tasks",data);

            taskCount(true);

        })
        .catch(e => console.log(e))
        .finally(() => submitBtn.innerHTML = "Add Task")
}

/**
 * 
 * @param {Event} e
 * @param {number} id
 */
export const patchHandler = (e,id) => {

    e.preventDefault();

    const data = getFormData(updateForm);
    let prevText = submitBtn.innerHTML;

    updateSubmitBtn.innerHTML = loader;
   
    fetch(`http://localhost:3000/api/jorm/task/${id}/`,{
        method : "PATCH",
        body : JSON.stringify(data),
        headers : {
            "Content-Type" : "application/json"
        }
    })
        .then( r => {
            if(r?.ok) {
                updateForm.classList.remove("all-screen-form-shown");
                updateForm.reset();

                r.json()
                    .then( task => {

                        console.log(task)

                        /*** Replace the old card by the updated one */
                        document.getElementById(id)
                            .replaceWith(buildTaskCardElt(task));

                        /*** Keep the updated data in locaStorage */
                        lsWrite("tasks",task);
                        
                    })
                    .catch( e => console.log(e.message) )


            } else {
                console.log(r)
            }
        })
        .catch(e => console.log(e.message))
        .finally(_=> updateSubmitBtn.innerHTML = prevText);
}


/**
 * 
 * @param {boolean} increment 
 * @param {boolean} reset 
 * @returns {void}
 */
export const taskCount = (increment=true,reset=false) => {

    if(reset) return taskCounter.innerHTML = 0;

    let tasksNumber = parseInt(taskCounter.innerHTML);

    if(isNaN(tasksNumber)) return;

    let n = increment ? tasksNumber + 1 : tasksNumber - 1;
    
    if(n >=10) return taskCounter.innerHTML = "10+";
    if(n <= 0) return taskCounter.innerHTML = "0";

    taskCounter.innerHTML = n;

}

/**
 * 
 * @param {object} user 
 * @returns {string}
 */
export const buildUser = (user) => {
    return `<li>${user.username}</li>`
}