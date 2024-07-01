<h1>TODO</h1>

- Support emojis
- Implement associations (ManyToMany)
- Store all the ids that have been created in the field diary. When somebody creates a data with association, we need to check if that id still exist in the database.
- Check if an id that a user wants to reference in an association exists.
- Create data in manyToMany associations and fetch the data. 


<h1>COMMIT CHANGES</h1>

- Added the possibility for users to save data omitting no required fields.
- Added functions to form reference field names. Reference field names should contains the name of their target models. This helps us figure out which model to get data from when fetching with eager loading.
- Implemented associations between tables 
- Implemented possibility for users to fetch data in OneToOne and OneToMany associations.
- Messed a little with the test application but it still works.

<h1>ISSUES</h1>

- Can't handle errors in controllers. Maybe because errors are thrown from functions and methodes used inside of the method we actually call. This seems to happen only on the [ create ] method.

- When I try to create a record, the date validation throws an error ( see validateField function in jorm-field-config-checks file). Fix this !!!!!!!!

- When you update a record and if you specified that a field should be unique, an error is being thown. Fix this shit.