import { showForm,hideForm,form } from "./elements.js";

showForm?.addEventListener("click",(e) => {

    e.preventDefault();

    form?.classList.add("shown");

})

hideForm?.addEventListener("click",(e) => {

    e.preventDefault();

    form?.classList.remove("shown");
})
