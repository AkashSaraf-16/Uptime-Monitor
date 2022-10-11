# Uptime-Monitor
A RESTful API for tracking the users' websites' checks made by them to monitor the changes in their states notified via sms.
Following are some key features of this API:
1) User can create their profile to login to system.
2) They can modify their profile.
3) They delete their profile.
4) Whenever they login a token is created which will be valid for an hour. We cant use expired token to login.
5) Once user is created he/she can create at max 5 checks for different websites with their initia state being defined by status codes.
6) Whenever there is change in the status codes we will receive an SMS mentioning the same.
