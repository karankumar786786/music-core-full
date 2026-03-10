const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/feed',
  method: 'GET',
  headers: {
    // Need a valid auth token or just bypass for test if possible,
    // but instead let's just curl the python engine directly
  }
};
