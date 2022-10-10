/*
 * Request handlers
 *
 */
// Dependencies
const { time } = require('console');
const { randomBytes } = require('crypto');
const { ftruncate } = require('fs');
const { type } = require('os');
const { features } = require('process');
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
// define the handlers
const handlers = {};

handlers.ping = function (data, callback) {
  // PING Handler
  callback(200);
};
handlers.notFound = function (data, callback) {
  callback(404);
};
// Containers for all the users sub-methods
handlers._users = {};
// Container for all the tokens:
handlers._tokens = {};
// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read('tokens', id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired yet
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};
// Users
handlers.users = function (data, callback) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};
// Users-post
handlers._users.post = function (data, callback) {
  // Sanity Checks:
  const firstName =
    typeof data.payload.firstName == 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  //tosAgreement - terms of service Agreement
  const tosAgreement =
    typeof data.payload.tosAgreement == 'boolean' &&
    data.payload.tosAgreement == true
      ? true
      : false;
  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that user doesnt already exist
    _data.read('users', phone, function (err, data) {
      if (err) {
        // Secuer the password - hash it
        const hashedPassword = helpers.hash(password);
        if (hashedPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement,
          };
          // Store the user
          _data.create('users', phone, userObject, function (err) {
            if (!err) {
              callback(200, { Message: 'Record created successfully' });
            } else {
              console.log(err);
              callback(500, { Error: "Couldn't create the user" });
            }
          });
        } else {
          callback(500, { Error: "Couldn't hash the user password" });
        }
      } else {
        // User already exist
        callback(400, {
          Error: 'A user with this phone number already exists! ',
        });
      }
    });
  } else {
    callback(400, { Error: 'You are missing the required field(s)!' });
  }
};
// Users-get
handlers._users.get = function (data, callback) {
  // Check the phone number is valid or not
  const phone =
    typeof data.queryStringObj.phone == 'string' &&
    data.queryStringObj.phone.trim().length == 10
      ? data.queryStringObj.phone
      : false;
  if (phone) {
    // Get the token from header
    const token =
      typeof data.headers.token == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            // Removing the sensitive password from object before giving output
            delete data.hashedPassword;
            console.log(data);
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: 'Missing required token in header,or token is invalid',
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};
// Users-put
handlers._users.put = function (data, callback) {
  // Check the phone number is valid or not
  const phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone
      : false;
  // Check the optional fields
  const firstName =
    typeof data.payload.firstName == 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName == 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone) {
    // If any of optional fields are there
    if (firstName || lastName || password) {
      // Get the token from header
      const token =
        typeof data.headers.token == 'string' ? data.headers.token : false;
      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
          // Search the user
          _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
              // Update the object
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the object
              _data.update('users', phone, userData, function (err) {
                if (!err) {
                  callback(200, { Message: 'Record updated successfully' });
                } else {
                  console.log(err);
                  callback(500, { Error: "Couldn't update the user" });
                }
              });
            } else {
              callback(400, { Error: 'Specified user doesnt exist !!!' });
            }
          });
        } else {
          callback(403, {
            Error: 'Missing required token in header,or token is invalid',
          });
        }
      });
    } else {
      callback(400, { Error: 'Missing the field to update' });
    }
  } else {
    callback(400, { Error: 'Missing required field/s !' });
  }
};
// Users-delete
handlers._users.delete = function (data, callback) {
  // Check the phone number is valid or not
  const phone =
    typeof data.queryStringObj.phone == 'string' &&
    data.queryStringObj.phone.trim().length == 10
      ? data.queryStringObj.phone
      : false;
  if (phone) {
    // Get the token from header
    const token =
      typeof data.headers.token == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        _data.read('users', phone, function (err, userData) {
          if (!err && data) {
            _data.delete('users', phone, function (err) {
              if (!err) {
                // Delete all the files(checks) associated with user
                // Get the user checks
                const userChecks =
                  typeof userData.checks == 'object' &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  // Delete the checks
                  let checksDeleted = 0;
                  let deletionError = false;
                  // Loop throuhg the checks and delete them one by one
                  userChecks.forEach(function (checkId) {
                    // Delete the check
                    _data.delete('checks', checkId, function (err) {
                      if (err) {
                        deletionError = true;
                      }
                      checksDeleted++;
                      if (checksToDelete === checksDeleted) {
                        if (!deletionError) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              'Error encountered while deleting all checks all checks may not be deleted successfully !!! ',
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Couldn't delete the specified user" });
              }
            });
          } else {
            callback(404, { Error: "Couldn't find the specified user" });
          }
        });
      } else {
        callback(403, {
          Error: 'Missing required token in header,or token is invalid',
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens
handlers.tokens = function (data, callback) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};
// Tokens-post
// Required fields- phone and password
handlers._tokens.post = function (data, callback) {
  const phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  const password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  if (phone && password) {
    // Lookup the user who matches the phone
    _data.read('users', phone, function (err, userData) {
      if (!err && userData) {
        // hash the sent password and compare it with the one stored in json
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // If valid create a new token with random name, set expiration date 1 hour in future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };
          _data.create('tokens', tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Couldn't create the new token" });
            }
          });
        } else {
          callback(400, {
            Error:
              "Password didn't match with the specified user's password stored !!!",
          });
        }
      } else {
        callback(400, { Error: "Couldn't find the specified user" });
      }
    });
  } else {
    callback(400, { Error: 'Required field/s is/are missing!!' });
  }
};
// Tokens-get
handlers._tokens.get = function (data, callback) {
  // Check the phone number is valid or not
  const id =
    typeof data.queryStringObj.id == 'string' &&
    data.queryStringObj.id.trim().length == 20
      ? data.queryStringObj.id
      : false;
  if (id) {
    // Lookup the token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};
// Tokens-put
//
handlers._tokens.put = function (data, callback) {
  const id =
    typeof data.payload.id == 'string' && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend == 'boolean' && data.payload.extend == true
      ? true
      : false;
  if (id && extend) {
    // Lookup the Token
    _data.read('tokens', id, function (err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure token isn't already exists
        if (tokenData.expires > Date.now()) {
          // Set the expiry time an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update('tokens', id, tokenData, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Token expiry cant be extended !!!' });
            }
          });
        } else {
          callback(400, {
            Error:
              'The token has already expired and hence cant extend the expiry time now',
          });
        }
      } else {
        callback(400, { Error: "Specified token doesn't exist" });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required filed(s) or filed(s) are invalid',
    });
  }
};
// Tokens-delete
handlers._tokens.delete = function (data, callback) {
  // Check that id is valid or not
  const id =
    typeof data.queryStringObj.id == 'string' &&
    data.queryStringObj.id.trim().length == 20
      ? data.queryStringObj.id
      : false;
  if (id) {
    _data.read('tokens', id, function (err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Couldn't delete the specified token" });
          }
        });
      } else {
        callback(404, { Error: "Couldn't find the specified token" });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks
handlers.checks = function (data, callback) {
  const acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all checks methods
handlers._checks = {};

// Checks-post
// Requird data: protocol,url,method,successCodes,timeoutSeconds

handlers._checks.post = function (data, callback) {
  // Sanity checks
  const protocol =
    typeof data.payload.protocol == 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url == 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method == 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the tokens from headers
    const token =
      typeof data.headers.token == 'string' ? data.headers.token : false;
    // Lookup the user by reading the token
    _data.read('tokens', token, function (err, tokenData) {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
        // Lookup the user data
        _data.read('users', userPhone, function (err, userData) {
          if (!err && userData) {
            // Get the user checks
            const userChecks =
              typeof userData.checks == 'object' &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            // Verify that user has less no. of max-checks-per-user
            if (userChecks.length < config.maxChecks) {
              // Create a random if for check
              const checkId = helpers.createRandomString(20);

              // Create the checkObject and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };
              // Save the checkObject to file
              _data.create('checks', checkId, checkObject, function (err) {
                if (!err) {
                  // Add the checkId to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, function (err) {
                    if (!err) {
                      // Return the data after the new checks
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: "Counldn't update the user with the new checks",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Couldn't create the new check" });
                }
              });
            } else {
              callback(400, {
                Error:
                  'The User already has the maximum number of checks(' +
                  config.maxChecks +
                  ')',
              });
            }
          } else {
            callback(403);
          }
        });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required inputs, or inputs are invalid',
    });
  }
};
// Checks-get
// Required data: id
handlers._checks.get = function (data, callback) {
  // Check the phone number is valid or not
  const id =
    typeof data.queryStringObj.id == 'string' &&
    data.queryStringObj.id.trim().length == 20
      ? data.queryStringObj.id
      : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from header
        const token =
          typeof data.headers.token == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created it
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (tokenIsValid) {
            if (tokenIsValid) {
              // Return the check data
              callback(200, checkData);
            } else {
              callback(403, {
                Error: 'Missing required token in header,or token is invalid',
              });
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks-put
// Required data: id
handlers._checks.put = function (data, callback) {
  // Check for required fields
  const id =
    typeof data.payload.id == 'string' && data.payload.id.trim().length == 20
      ? data.payload.id
      : false;
  // Check the optional fields
  const protocol =
    typeof data.payload.protocol == 'string' &&
    ['http', 'https'].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;
  const url =
    typeof data.payload.url == 'string' && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;
  const method =
    typeof data.payload.method == 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;
  const successCodes =
    typeof data.payload.successCodes == 'object' &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;
  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == 'number' &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;
  if (id) {
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read('checks', id, function (err, checkData) {
        if (!err && checkData) {
          // Get the token from header
          const token =
            typeof data.headers.token == 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created it
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            function (tokenIsValid) {
              if (tokenIsValid) {
                // Update the data
                if (protocol) checkData.protocol = protocol;
                if (url) checkData.url = url;
                if (method) checkData.method = method;
                if (successCodes) checkData.successCodes = successCodes;
                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;
                // Store the updated data
                _data.update('checks', id, checkData, function (err) {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: "Couldn't update the data!!!" });
                  }
                });
              } else {
                callback(403, {
                  Error: 'Missing required token in header,or token is invalid',
                });
              }
            }
          );
        } else {
          callback(400, { Error: "Check Id doesn't exist" });
        }
      });
    } else {
      callback(400, { Error: 'Missing fileds to update!!!' });
    }
  } else {
    callback(400, { Error: 'Missing the required fields!!!' });
  }
};

// Checks-delete
// Required data: id
handlers._checks.delete = function (data, callback) {
  // Check the id is valid or not
  const id =
    typeof data.queryStringObj.id == 'string' &&
    data.queryStringObj.id.trim().length == 20
      ? data.queryStringObj.id
      : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from header
        const token =
          typeof data.headers.token == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (tokenIsValid) {
            if (tokenIsValid) {
              // Delete the check data
              _data.delete('checks', id, function (err) {
                if (!err) {
                  _data.read(
                    'users',
                    checkData.userPhone,
                    function (err, userData) {
                      if (!err && userData) {
                        // Get the user checks
                        const userChecks =
                          typeof userData.checks == 'object' &&
                          userData.checks instanceof Array
                            ? userData.checks
                            : [];
                        // Remove the specified check from user
                        const checkPos = userChecks.indexOf(id);
                        if (checkPos > -1) {
                          userChecks.splice(checkPos, 1);
                          // Update the user with new data
                          _data.update(
                            'users',
                            checkData.userPhone,
                            userData,
                            function (err) {
                              if (!err) {
                                callback(200);
                              } else {
                                callback(500, {
                                  Error: "Couldn't update the specified user",
                                });
                              }
                            }
                          );
                        } else {
                          callback(500, {
                            Error:
                              "Couldn't find the check on user object and hence can't remove it!!!",
                          });
                        }
                      } else {
                        callback(500, {
                          Error:
                            "Couldn't find the user who created the check, so could not remove the check from the list of check on user object",
                        });
                      }
                    }
                  );
                } else {
                  callback(500, { Error: "Couldn't delete the check data!!!" });
                }
              });
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(400, { Error: "Specified check  doesn't exist" });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};
module.exports = handlers;
