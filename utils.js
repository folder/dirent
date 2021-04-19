'use strict';

const { getOwnPropertyDescriptor } = Reflect;

const fs = require('fs');
const path = require('path');
const isObject = value => value !== null && typeof value === 'object';
const isWindows = process.platform === 'win32';

exports.handlers = (Dirent, dirent) => ({
  get(file, prop) {
    if (exports.builtinProperties.has(prop)) return file[prop];

    // use "dirent.constructor" for subclassing
    const ctorProtoDesc = getOwnPropertyDescriptor(dirent.constructor.prototype, prop);
    if (ctorProtoDesc && typeof ctorProtoDesc.value === 'function' && !(dirent instanceof fs.Dirent)) {
      return ctorProtoDesc[prop];
    }

    // then check Dirent
    const protoDesc = getOwnPropertyDescriptor(Dirent.prototype, prop);
    if (protoDesc && typeof protoDesc.value === 'function') {
      return file[prop];
    }

    // then "file"
    const fileDesc = getOwnPropertyDescriptor(file.constructor.prototype, prop);
    if (fileDesc && typeof fileDesc.value !== 'function') {
      return file[prop];
    }

    // then "stat" and instance properties
    const objects = [file.stat, dirent, dirent.stat];
    const obj = objects.find(obj => obj && prop in obj) || file;
    return obj[prop];
  }
});

exports.builtinProperties = new Set(['constructor', 'contents', 'stat', 'history', 'path', 'base', 'cwd']);

exports.isBuffer = value => {
  if (isObject(value) && value.constructor && typeof value.constructor.isBuffer === 'function') {
    return value.constructor.isBuffer(value);
  }
  return false;
};

exports.isStream = value => {
  if (isObject(value) && typeof value.pipe === 'function') {
    return typeof value.on === 'function';
  }
  return false;
};

exports.removeTrailingSep = str => {
  let i = str.length;
  while (i > 1 && (str[i - 1] === '/' || (isWindows && str[i - 1] === '\\'))) i--;
  return str.slice(0, i);
};

exports.normalize = input => {
  return input ? path.normalize(input) : '';
};

exports.replaceExtname = (filepath, extname) => {
  if (typeof filepath !== 'string') return filepath;
  if (filepath === '') return filepath;

  const { dir, name } = path.parse(filepath);

  if (!extname.startsWith('.')) {
    extname = `.${extname}`;
  }

  return path.join(dir, `${name}${extname}`);
};

exports.pathError = (prop, key = 'set') => {
  return `Expected "file.path" to be a string, cannot ${key} "file.${prop}".`;
};
