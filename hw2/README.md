# Running Instructions for Homework 2 Solutions

This program requires Node.js to run.

To run this program, unzip readWriteRecords.zip.
Set the command line directory to the `readWriteRecords` folder.
Run the command `npm i` to install necessary dependencies.
Run the command
```bash
node readWriteRecords.js
```
to run the program, without Jasmine testing.
Run the command
```bash
npm test
```
to run the Jasmine tests.

Note: This program attempts to inform the user of every error within the input file.
However, in some cases a single issue may result in multiple error messsages.
For this reason, if you intend to correct any errors within the input file, do so in order of the error messages.
For example, a record containing `IDENTIFIER:1 TIME:19980118T230000` in a single line will result in the program telling the user that there are multiple properties in 1 line **AND** the record does not have a `TIME` value.
Despite the 2 error messages, the singular solution is to move `TIME:19980118T230000` to its own line.

Within the `spec` folder, the `readWriteRecords.spec.js` file contains the main functions of the 'readWriteRecords.js' program, checkRecords() and sortRecords(), and utilizes Jasmine to run several test cases for each.