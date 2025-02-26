const fs = require('fs');
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthCount = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// create Date object
function createDate(datetimegroup) {
  var format = /^\d{8}T\d{6}$/; // using RegEx to enforce format
  if (!format.test(datetimegroup))  // return error message if input does not follow YYYYMMDDTHHMMSS
      return 'Incorrect format. Please input in following form: YYYYMMDDTHHMMSS';
  let year = datetimegroup.slice(0,4);
  if (year == 0) // return error message if year is 0
      return 'Invalid date. Year must be a 4 digit number between 0001 and 9999.';

  let month = datetimegroup.slice(4,6);
  if (month == 0 || month > 12) // return error message if month is invalid
      return 'Invalid date. Month must be a 2 digit number between 01 and 12.';
  month = month - 1; // make month zero-based (January = 0)

  let dayOfMonth = datetimegroup.slice(6,8);
  
  if (dayOfMonth == 0) // return error message if day is 0
      return 'Invalid date. Day of month cannot be 0.';
  if (dayOfMonth > monthCount[month]) { // return error message if day is too large
      if (month == 1) { 
          if (year % 4 != 0 || (year % 100 == 0 && year % 400 != 0)) { // leap year check
              if (dayOfMonth == 29) {
                  return 'Invalid date. ' + year + ' is not a leap year.'; 
              } else {
                  return 'Invalid date. February, ' + year +' only has 28 days.';
              }
          } else if (dayOfMonth > 29) {
              return 'Invalid date. February, ' + year +' only has 29 days.';
          }
      } else {
          return 'Invalid date. ' + monthNames[month] + ' only has ' + monthCount[month] + ' days.';
      }
  }

  let hour = datetimegroup.slice(9,11);
  if (hour > 23) // return error message if hour is too large
      return 'Invalid time. Hour must be a 2 digit number between 00 and 23.';
  
  let minute = datetimegroup.slice(11,13);
  if (minute > 59) // return error message if minute is too large
      return 'Invalid time. Minute must be a 2 digit number between 00 and 59.';

  let second = datetimegroup.slice(13,15);
  if (second > 59) // return error message if second is too large
      return 'Invalid time. Second must be a 2 digit number between 00 and 59.';
  date = new Date(Date.UTC(year, month, dayOfMonth, hour, minute, second));
  return date;
}

// convert Date object back to YYYYMMDDTHHMMSS
function timeToString(time) {
  let timeStr = time.toISOString(); // convert Date to form YYYY-MM-DDTHH:mm:ss.sssZ
  timeStr = timeStr.replace(/(-|:|.000Z)+/g,''); // remove every - and : and .000Z (milliseconds)
  return timeStr;
}

// check if string taken from files represents a valid set of records and create array of records
function createRecords(rawRecords) {
  let lines = rawRecords.split(/\r\n|\r|\n/); // split text from file into lines
  let records = new Array();
  let counter = 0; // number of record
  let inRecord = false; // true if currently processing a record
  let error = false; // turns true if error is found
  
  let properties = ['IDENTIFIER:','TIME:','UNITS:','WEIGHT:','COLOR:']; // every valid property
  let propertiesRegex = new RegExp(properties.join('|'), 'i'); 

  let units = ['g','oz','kg','lb']; // every valid unit
  let unitsRegex = new RegExp('^' + units.join('$|^') + '$', 'i');

  let weightRegex = /^\d+\.?\d*$/; // for testing if weight is a positive number

  let colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/; // for testing if color is a valid hex code

  for (currentLine = 0; currentLine < lines.length; currentLine++) { // go through input line-by-line
    let keyValuePair = lines[currentLine].split(/:(.*)/s);
    keyValuePair[0] = keyValuePair[0].toUpperCase(); // make key words case-insensitive
    if (lines[currentLine] == '') { // skip blank lines
      continue;
    } else if (lines[currentLine].toUpperCase() == 'BEGIN:RECORD') {
      if (inRecord) {
        console.log('Error (line #' + currentLine + '). Each record must end with "END:RECORD".');
        error = true;
      }
      records[counter] = new Object();
      inRecord = true; // currently processing a record
    } else if (!inRecord) { // if not processing record, record does not have a begin
      console.log('Error (line #' + (currentLine+1) + '). Each record must begin with "BEGIN:RECORD".');
      records[counter] = new Object();
      currentLine--;
      inRecord = true; // currently processing a record
      error = true;
    } else if (lines[currentLine].toUpperCase() == 'END:RECORD') {
      counter++;
      inRecord = false; // no longer processing a record
    } else if (keyValuePair[1] == '') {
      console.log('Error (line #' + (currentLine+1) + '). Missing property value.');
      error = true;
    } else if (propertiesRegex.test(keyValuePair[1])) { // if value contains key, there are multiple properties in one line
      console.log('Error (line #' + (currentLine+1) + '). Each property must be within its own line.');
      error = true;
    } else if (keyValuePair[0] == 'IDENTIFIER') {
      if (records[counter].identifier != null) { // error if multiple identifiers
        console.log('Error (line #' + (currentLine+1) + '). Each record can only have 1 identifier.');
        error = true;
      }
      records[counter].identifier = keyValuePair[1];
      for (i = counter - 1; i >= 0; i--) {
        if (records[counter].identifier == records[i].identifier) { // identifier will be case-sensitive
          console.log('Error. Record #' + (counter+1) + ' has the same identifier as Record #' + (i+1) + '.');
          error = true;
        }
      }
    } else if (keyValuePair[0] == 'TIME') {
      if (records[counter].time != null) { // error if multiple times
        console.log('Error (line #' + (currentLine+1) + '). Each record can only have 1 date-time of creation.');
        error = true;
      }
      records[counter].time = createDate(keyValuePair[1].toString());
      if (typeof records[counter].time != 'object') { // error if invalid time
        console.log('Error (line #' + (currentLine+1) + '). ' + records[counter].time);
        error = true;
      }
    } else if (keyValuePair[0] == 'UNITS') {
      if (records[counter].units != null) { // error if multiple units
        console.log('Error (line #' + (currentLine+1) + '). Each record can only have 1 assigned unit.');
        error = true;
      }
      records[counter].units = keyValuePair[1];
      if (!unitsRegex.test(records[counter].units)) { // error if invalid unit
        console.log('Error (line #' + (currentLine+1) + '). Units must be one of the following: ' + units);
        error = true;
      }
    } else if (keyValuePair[0] == 'WEIGHT') {
      if (records[counter].weight != null) { // error if multiple weights
        console.log('Error (line #' + (currentLine+1) + '). Each record can only have 1 weight.');
        error = true;
      }
      records[counter].weight = keyValuePair[1];
      if (!weightRegex.test(records[counter].weight) || records[counter].weight == 0) { // error if weight isn't a positive, non-zero number
        console.log('Error (line #' + (currentLine+1) + '). Weight must be a (positive, non-zero) number.');
        error = true;
      }
    } else if (keyValuePair[0] == 'COLOR') {
      if (records[counter].color != null) { // error if multiple colors
        console.log('Error (line #' + (currentLine+1) + '). Each record can only have 1 color.');
        error = true;
      }
      records[counter].color = keyValuePair[1];
      if (!colorRegex.test(records[counter].color)) { // error if invalid color
        console.log('Error (line #' + (currentLine+1) + '). Color must be a Hexadecimal Color Code (example: "#000000").');
        error = true;
      }
    } else { // line has an unrecognized property
      console.log('Error (line #' + (currentLine+1) + '). '+ keyValuePair[0] +' is not a valid property.');
      error = true;
    }
  }
  if (inRecord) { // if still processing record, last record didn't have an end
    console.log('Error (line #' + (currentLine+1) + '). Each record must end with "END:RECORD".');
    error = true;
  }
  // checking for necessary properties  
  for (i = 0; i < records.length; i++) {
    if (records[i].identifier == null) {
      console.log('Error. Record #' + (i+1) + ' does not have an identifier (IDENTIFIER:VALUE).');
      error = true;
    }
    if (records[i].time == null) {
      console.log('Error. Record #' + (i+1) + ' does not have an assigned time (TIME:YYYYMMDDTHHMMSS).');
      error = true;
    }
    if ((records[i].units == null) && (records[i].weight != null)) {
      console.log('Error. Record #' + (i+1) + ' has an assigned weight but does not have assigned units (UNITS:VALUE).');
      error = true;
    }
    if ((records[i].units != null) && (records[i].weight == null)) {
      console.log('Error. Record #' + (i+1) + ' has assigned units but does not have an assigned weight (WEIGHT:VALUE).');
      error = true;
    }
  }
  if (!error)
    return records;
  return -1;
}

// sort records using a modified quicksort that can handle duplicates
function sortRecords(records) { 
  if (records.length <= 1)
    return records;
  let pivot = records[0];
  records.shift();  
  let left = [];
  let right = [];
  for (i = 0; i < records.length; i++) {
    if (records[i].time <= pivot.time) {
      left.push(records[i]);
    } else {
      right.push(records[i]);
    }
  }
  return[...sortRecords(left), pivot, ...sortRecords(right)];
}

// convert Array of records to String
function recordsToString(records) {
  let recordsStr = '';
  for (i = 0; i < records.length; i++) {
    recordsStr = recordsStr + 'BEGIN:RECORD\nIDENTIFIER:' + records[i].identifier + '\nTIME:' + timeToString(records[i].time);
    if (records[i].weight != null) {
      recordsStr = recordsStr + '\nWEIGHT:' + records[i].weight;
      if (records[i].units != null)
        recordsStr = recordsStr + '\nUNITS:' + records[i].units;
    }
    if (records[i].color != null)
      recordsStr = recordsStr + '\nCOLOR:' + records[i].color;
    recordsStr = recordsStr + '\nEND:RECORD';
    if (i != records.length - 1) // go to next line only if there are more records
      recordsStr = recordsStr + '\n';
  }
  return recordsStr;
} 

// read records.txt
try {
  rawRecords = fs.readFileSync('records.txt', 'utf8');
} catch (err) {
  console.error(err);
}

let records = createRecords(rawRecords);
// if no errors, sort records and write sorted records to new file
if (records != -1) {
  let recordsCopy = new Array(...records);
  let sortedRecords = sortRecords(recordsCopy);
  let sortedRecordsStr = recordsToString(sortedRecords);
  try {
    fs.writeFileSync('sortedRecords.txt', sortedRecordsStr);
    // file written successfully
    console.log('Successfully stored sorted records to sortedRecords.txt');
  } catch (err) {
    console.error(err);
  }
}