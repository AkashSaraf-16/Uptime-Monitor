/*
Create and export configuration variable
*/
// Step 1: Container for all environments:
let environments = {};

// Staging (default) Environment:
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: '',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: '',
  },
};

// Production Environment:
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: '',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: '',
  },
};

// Step 2: Determining which environmnet was passed in command line argument

let currentEnvironment =
  typeof process.env.NODE_ENV == 'string'
    ? process.env.NODE_ENV
    : environments.staging;
// Step 3: Exporting the one of the above environments dependiing upon input else default environment
let environmentToExport =
  typeof environments[currentEnvironment] == 'object'
    ? environments[currentEnvironment]
    : environments.staging;
// Step 4: Export the module
module.exports = environmentToExport;
