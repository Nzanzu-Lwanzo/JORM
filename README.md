
<h1>Notes</h1>

1. In developpement, if you use nodemon, the server will restart everytime you perform a request to your model. This is due to the fact that nodemon is designed to watch for the slightest change that happens in ".js,.mjs,.cjs,.json" files. So, as our model files are .json, everytime we write data to it or read data from it, nodemon will automatically restart the server. 

    To avoid this, use the following command when launching the server : 

        nodemon --ignore your-database-directory/ you-entry-point-file.js
    
    Or include a " nodemon.json " file at the root of your project with the following content :
        
        {
            "ignore" : ["**/you-database-directory/**]
        }

2. In your " package.json " file, inside of the scripts object, let the " migrate " command point to the file that creates your models. You could instantiate models in different files, import them in one file and execute this command to create their files at the same time.


<h1>TODO</h1>

- Save the default value data if any was specified.
- Protect jorm database related files by crypting them with a secret key or by any other mean.
- Handle dates registering
- Implement the possibility for users to submit data omitting no required fields (ex : If [ user ] has got two fieds [ username ] and [ age ]. The first one is required but not the second one. The user can only submit data with [ username ] value and omit the age one which will receive either the defaulValue either null.)