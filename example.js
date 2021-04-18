'use strict';

const fs = require('fs');
const Dirent = require('.');

console.log(new Dirent(__filename));

const dirent = new Dirent({ path: __filename });
console.log(dirent);
console.log(dirent.name);
console.log(dirent.basename);
console.log(dirent.path);

const file = new Dirent({ path: 'example.js', stat: fs.statSync(__filename) });
console.log(file);
console.log('stem', [file.stem]);
console.log('name', [file.name]);
console.log('basename', [file.basename]);
console.log('path', [file.path]);
console.log('absolute', [file.absolute]);
console.log('base', [file.base]);
console.log('relative', [file.relative]);
console.log('isDirectory', [file.isDirectory()]);
console.log('isFile', [file.isFile()]);
console.log('isSymbolicLink', [file.isSymbolicLink()]);

console.log(new Dirent('some/file/path.txt'));
console.log(new Dirent({ path: 'some/file/path.txt' }));

// assuming __filename is /Users/jonschlinkert/dev/dirent/example.js
const file2 = new Dirent(__filename);
console.log(file2.dirname);
//=> /Users/jonschlinkert/dev//dirent
console.log(file2.basename);
//=> example.js
console.log(file2.stem);
//=> example
console.log(file2.extname);
//=> .js
