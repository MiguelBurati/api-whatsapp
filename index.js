// index.js
require('dotenv').config();

const { startBot } = require('./src');
startBot().catch(console.error);