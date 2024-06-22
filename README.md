
<h1>Notes</h1>

1. In developpement, if you use nodemon, the server will restart everytime you perform a request to your model. This is due to the fact that nodemon is designed to watch for the slightest change that happens in ".js,.mjs,.cjs,.json" files. So, as our model files are .json, everytime we write data to it or read data from it, nodemon will automatically restart the server. 

    To avoid this, use the following command when launching the server : 

        nodemon --ignore your-database-directory/ you-entry-point-file.js
    
    Or include a " nodemon.json " file at the root of your project with the following content :
        
        {
            "ignore" : ["**/you-database-directory/**]
        }

2. In your " package.json " file, inside of the scripts object, let the " migrate " command point to the file that creates your models. You could instantiate models in different files, import them in one file and execute this command to create their files at the same time.

3. Files are not crypted, which is something we'll probably implement in the future. But, for the moment being, just keep in mind that data are not securely stored. Don't store authentication data like passwords or sensible data like credit cards numbers.

<h1>TODO</h1>

- Implement the possibility for users to submit data omitting no required fields (ex : If [ user ] has got two fieds [ username ] and [ age ]. The first one is required but not the second one. The user can only submit data with [ username ] value and omit the age one which will receive either the defaulValue either null.)
- Support emojis
- Implement associations (OneToOne, ManyToMany, OneToMany, ManyToOne)

<h1>COMMIT CHANGES</h1>

- Added validation using validator.js
- Added date validation in the field-constraints constructor
- Added possibility to save default data in case any was provided for no required fields.
- In the mini app, I had created a model named [ User ] but that stored [ tasks ] instead. This error could have led to misundertanding issues. I fixed it.

<h1>ISSUES</h1>

- Can't handle errors in controllers. Maybe because errors are thrown from functions and methodes used inside of the method we actually call.