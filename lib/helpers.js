/*
 *
 *Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');
// Container for all the helpers

const helpers = {};
// Parse a JSON string to an object in all cases, w/o throwing
helpers.parseJsonToObject = function (str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create a SHA256 hash
helpers.hash = function (str) {
  if (typeof str == 'string' && str.trim().length > 0) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Create a random string
helpers.createRandomString = function (strLen) {
  strLen = typeof strLen == 'number' && strLen > 0 ? strLen : false;
  if (strLen) {
    // All possible characters in stream of random characters\
    const possibleChars = 'abcdefghijklmnopqrstuvwxyz012345678';
    // Start the final string
    var str = '';
    for (i = 1; i <= 20; i++) {
      // Get a random character
      let randomChar = possibleChars.charAt(
        Math.floor(Math.random() * possibleChars.length)
        // Append this character to the end
      );
      str += randomChar;
    }
    // Return the final string
    return str;
  }
};
// Send an SMS via twilio
helpers.sendTwilioSms = function (phone, msg, callback) {
  // Validate parameters
  phone =
    typeof phone == 'string' && phone.trim().length == 10
      ? phone.trim()
      : false;
  msg =
    typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;
  if (phone && msg) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: '+91' + phone,
      Body: msg,
    };
    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path:
        '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
      auth: config.twilio.accountSid + ':' + config.twilio.authToken,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };
    // Instantiate the request object
    const req = https.request(requestDetails, function (res) {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if the request went through
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback('Status code returned was ' + status);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function (e) {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};

module.exports = helpers;
