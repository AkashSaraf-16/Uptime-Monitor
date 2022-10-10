/*
 *
 * Library for storing and editing data
 */
// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
// Container for module to be exported
const lib = {};
//Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');
//to write data on file
// params: dir- path of file ;file-exact file ;data- to be written
lib.create = function (dir, file, data, callback) {
  // Open the file for writing
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'wx',
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data);
        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, function (err) {
          if (!err) {
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                callback(false);
              } else {
                callback(`Error closing the file`);
              }
            });
          } else {
            callback('Error writing to new file!');
          }
        });
      } else {
        callback(`Couldn't create new file, it may already exist`);
      }
    }
  );
};
// to read data from file
lib.read = function (dir, file, callback) {
  fs.readFile(
    lib.baseDir + dir + '/' + file + '.json',
    'utf8',
    function (err, data) {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        callback(false, parsedData);
      } else {
        callback(err, data);
      }
    }
  );
};
// to update data on a file

lib.update = function (dir, file, data, callback) {
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'r+',
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // Convert the data to string
        const stringData = JSON.stringify(data);
        // Upadate the file
        fs.ftruncate(fileDescriptor, function (err) {
          if (!err) {
            fs.writeFile(fileDescriptor, stringData, function (err) {
              if (!err) {
                fs.close(fileDescriptor, function (err) {
                  if (!err) {
                    callback(false);
                  } else {
                    callback('Error closing the file');
                  }
                });
              } else {
                callback('Error writing the file');
              }
            });
          } else {
            callback('Error while truncating file');
          }
        });
      } else {
        callback(`This file can't be modified, it may not exist`);
      }
    }
  );
};
// to delete the file

lib.delete = function (dir, file, callback) {
  // Unlink the file
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function (err) {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting the file , it may not exist!');
    }
  });
};

//List all the items in a directory
lib.list = function (dir, callback) {
  fs.readdir(lib.baseDir + dir + '/', function (err, data) {
    if (!err && data && data.length > 0) {
      let trimmedFileName = [];
      data.forEach(function (fileName) {
        trimmedFileName.push(fileName.replace('.json', ''));
      });
      callback(false, trimmedFileName);
    } else {
      callback(err, data);
    }
  });
};
// Export the module
module.exports = lib;
