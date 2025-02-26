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

describe("testing error detection", function() {
  const parameters = [
      {description: "should return -1 if record does not have BEGIN:RECORD", input: fs.readFileSync('testcases/noBEGIN.txt', 'utf8')},
      {description: "should return -1 if record does not have END:RECORD", input: fs.readFileSync('testcases/noEND.txt', 'utf8')},
      {description: "should return -1 if last record does not have END:RECORD", input: fs.readFileSync('testcases/noEND_last.txt', 'utf8')},
      {description: "should return -1 if record property is missing value", input: fs.readFileSync('testcases/noValue.txt', 'utf8')},
      {description: "should return -1 if there are multiple properties in a single line", input: fs.readFileSync('testcases/multipleProperties.txt', 'utf8')},
      {description: "should return -1 if record has multiple identifiers", input: fs.readFileSync('testcases/multipleIdentifiers.txt', 'utf8')},
      {description: "should return -1 if record has multiple times", input: fs.readFileSync('testcases/multipleTimes.txt', 'utf8')},
      {description: "should return -1 if record has multiple units", input: fs.readFileSync('testcases/multipleUnits.txt', 'utf8')},
      {description: "should return -1 if record has multiple weights", input: fs.readFileSync('testcases/multipleWeights.txt', 'utf8')},
      {description: "should return -1 if record has multiple colors", input: fs.readFileSync('testcases/multipleColors.txt', 'utf8')},
      {description: "should return -1 if record has invalid property", input: fs.readFileSync('testcases/invalidProperty.txt', 'utf8')},
      {description: "should return -1 if record does not have an identifier", input: fs.readFileSync('testcases/noIdentifier.txt', 'utf8')},
      {description: "should return -1 if record does not have a time", input: fs.readFileSync('testcases/noTime.txt', 'utf8')},
      {description: "should return -1 if record has a weight but does not have units", input: fs.readFileSync('testcases/weightNoUnits.txt', 'utf8')},
      {description: "should return -1 if record has units but does not have a weight", input: fs.readFileSync('testcases/unitsNoWeight.txt', 'utf8')},
      {description: "should return -1 if at least 2 records have the same identifier", input: fs.readFileSync('testcases/matchingIdentifiers.txt', 'utf8')},
      {description: "should return -1 if time is invalid", input: fs.readFileSync('testcases/invalidTime.txt', 'utf8')},
      {description: "should return -1 if units is invalid", input: fs.readFileSync('testcases/invalidUnits.txt', 'utf8')},
      {description: "should return -1 if weight is not a number", input: fs.readFileSync('testcases/invalidWeight.txt', 'utf8')},
      {description: "should return -1 if weight is a negative number", input: fs.readFileSync('testcases/negativeWeight.txt', 'utf8')},
      {description: "should return -1 if weight is 0", input: fs.readFileSync('testcases/zeroWeight.txt', 'utf8')},
      {description: "should return -1 if color is invalid", input: fs.readFileSync('testcases/invalidColor.txt', 'utf8')},
  ];

  parameters.forEach((parameter) => {
      it(parameter.description, () => {
          expect(createRecords(parameter.input)).toEqual(-1);
      });
  });
});

describe("testing records returned without error", function() {
  const parameters = [
      {description: "should return array of records with any capitalization on properties", input: fs.readFileSync('testcases/capitalization.txt', 'utf8')},
      {description: "should return array of records with all properties", input: fs.readFileSync('testcases/allProperties.txt', 'utf8')},
      {description: "should return array of records with only identifier and time", input: fs.readFileSync('testcases/identifierAndTime.txt', 'utf8')},
      {description: "should return array of records when some have every property and others have only necessary", input: fs.readFileSync('testcases/mixed.txt', 'utf8')},
      {description: "should return array of records with blank line(s) at beginning", input: fs.readFileSync('testcases/blankBeginning.txt', 'utf8')},
      {description: "should return array of records with blank line(s) in middle", input: fs.readFileSync('testcases/blankMiddle.txt', 'utf8')},
      {description: "should return array of records with blank line(s) at end", input: fs.readFileSync('testcases/blankEnd.txt', 'utf8')},
  ];

  parameters.forEach((parameter) => {
      it(parameter.description, () => {
          expect(createRecords(parameter.input)).not.toEqual(-1);
      });
  });
});

describe("testing empty input file", function() {
  it("should return an empty array", () => {
    expect(createRecords(fs.readFileSync('testcases/empty.txt', 'utf8'))).toEqual(new Array());
  });
});

describe("testing large input file", function() {
  it("should return array of correct size", () => {
    expect(createRecords(fs.readFileSync('testcases/manyRecords.txt', 'utf8')).length).toEqual(128);
  });
});

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


describe("testing sorting with no duplicates -- part 1", function() {
  it("should return array of correct size", () => {
    let recordsNoDupes = new Array();
    let years = ['19980118T230000','53041111T111111','19091201T001234','75050627T002340','52100302T151515','02060118T230000'];
    for (i = 0; i < years.length; i++) {
      recordsNoDupes[i] = new Object();
      recordsNoDupes[i].identifier = i;
      recordsNoDupes[i].time = createDate(years[i]);
    }
    let recordsCopy = new Array(...recordsNoDupes);
    let sorted = sortRecords(recordsCopy);
      expect(sorted.length).toEqual(recordsNoDupes.length);
  });
  it("earlier date should be before later date", () => {
    let recordsNoDupes = new Array();
    let years = ['19980118T230000','53041111T111111','19091201T001234','75050627T002340','52100302T151515','02060118T230000'];
    for (i = 0; i < years.length; i++) {
      recordsNoDupes[i] = new Object();
      recordsNoDupes[i].identifier = i;
      recordsNoDupes[i].time = createDate(years[i]);
    }
    let recordsCopy = new Array(...recordsNoDupes);
    let sorted = sortRecords(recordsCopy);
    for (i = 0; i < sorted.length-1; i++) {
      expect(sorted[i].time <= sorted[i+1].time).toEqual(true);
    }
  });
});

describe("testing sorting with no duplicates -- part 2", function() {
  it("should return array of correct size", () => {
    let recordsDupes = new Array();
    let years = ['19980118T230000','53041111T111111','53041111T111111','19980118T230000','52100302T151515','02060118T230000'];
    for (i = 0; i < years.length; i++) {
      recordsDupes[i] = new Object();
      recordsDupes[i].identifier = i;
      recordsDupes[i].time = createDate(years[i]);
    }
    let recordsCopy = new Array(...recordsDupes);
    let sorted = sortRecords(recordsCopy);
      expect(sorted.length).toEqual(recordsDupes.length);
  });
  it("earlier date should be before later date", () => {
    let recordsDupes = new Array();
    let years = ['19980118T230000','53041111T111111','19091201T001234','75050627T002340','52100302T151515','02060118T230000'];
    for (i = 0; i < years.length; i++) {
      recordsDupes[i] = new Object();
      recordsDupes[i].identifier = i;
      recordsDupes[i].time = createDate(years[i]);
    }
    let recordsCopy = new Array(...recordsDupes);
    let sorted = sortRecords(recordsCopy);
    for (i = 0; i < sorted.length-1; i++) {
      expect(sorted[i].time <= sorted[i+1].time).toEqual(true);
    }
  });
});