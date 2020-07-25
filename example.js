'use strict';

const Dirent = require('.');

console.log(new Dirent(__filename));
console.log(new Dirent({ path: __filename }));
