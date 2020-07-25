'use strict';

const kBase = Symbol('base');
const kCwd = Symbol('cwd');
const kContents = Symbol('contents');
const kSymlink = Symbol('symlink');
const kDirent = Symbol('dirent');

const fs = require('fs');
const path = require('path');
const util = require('util');
const assert = require('assert');

const {
  builtInFields,
  handlers,
  isBuffer,
  isStream,
  join,
  normalize,
  pathError,
  replaceExtname
} = require('./utils');

class Dirent extends fs.Dirent {
  constructor(dirent = {}, type) {
    if (typeof dirent === 'string') dirent = { path: dirent };
    const name = dirent.name;
    const dir = dirent.dirname || dirent.cwd || process.cwd();
    if (!name) dirent.name = dirent.basename || (dirent.path ? path.basename(dirent.path) : '');
    if (!dirent.path && name) dirent.path = join(dir, dirent.name);
    super(dirent.name, type);

    this[kDirent] = dirent;
    this.contents = dirent.contents || null;
    this.stat = dirent.stat || null;

    const history = [].concat(dirent.history || []).concat(dirent.path || []);
    this.history = [];

    for (const value of history) {
      this.path = value;
    }

    this.cwd = dirent.cwd || process.cwd();
    this.base = dirent.base;

    for (const key of Object.keys(dirent)) {
      if (!builtInFields.has(key)) {
        this[key] = dirent[key];
      }
    }

    return new Proxy(this, handlers(Dirent, dirent));
  }

  isDirectory() {
    if (!this.isNull()) return false;
    if (typeof this[kDirent].isDirectory === 'function') {
      return this[kDirent].isDirectory();
    }
    if (this.stat && typeof this.stat.isDirectory === 'function') {
      return this.stat.isDirectory();
    }
    return super.isDirectory();
  }

  isSymlink() {
    return this.isSymbolicLink();
  }
  isSymbolic() {
    return this.isNull() && this.isSymbolicLink();
  }

  isBuffer() {
    return isBuffer(this.contents);
  }

  isStream() {
    return isStream(this.contents);
  }

  isNull() {
    return this.contents === null;
  }

  inspect() {
    return this[util.inspect.custom]();
  }

  set contents(value) {
    assert(this.constructor.isValidContents(value), 'Expected file.contents to be a Buffer, Stream, or null.');
    this[kContents] = value;
  }
  get contents() {
    return this[kContents];
  }

  set cwd(cwd) {
    assert(cwd && typeof cwd === 'string', 'file.cwd should be a non-empty string');
    this[kCwd] = normalize(cwd);
  }
  get cwd() {
    return this[kCwd];
  }

  set base(value) {
    if (value == null) {
      delete this[kBase];
      return;
    }

    assert(value && typeof value === 'string', 'file.base should be a non-empty string, null, or undefined');
    value = normalize(value);

    if (value === this[kCwd]) {
      delete this[kBase];
      return;
    }

    this[kBase] = value;
  }
  get base() {
    return this[kBase] || this[kCwd];
  }

  set dirname(dirname) {
    assert(this.path, pathError('dirname', 'set'));
    this.path = path.join(dirname, this.basename);
  }
  get dirname() {
    assert(this.path, pathError('dirname', 'get'));
    return path.dirname(this.path);
  }

  set basename(basename) {
    assert(this.path, pathError('basename', 'set'));
    this.path = path.join(this.dirname, basename);
  }
  get basename() {
    assert(this.path, pathError('basename', 'get'));
    return path.basename(this.path);
  }

  set stem(stem) {
    assert(this.path, pathError('stem', 'set'));
    this.path = path.join(this.dirname, stem + this.extname);
  }
  get stem() {
    assert(this.path, pathError('stem', 'get'));
    return path.basename(this.path, this.extname);
  }

  set extname(extname) {
    assert(this.path, pathError('extname', 'set'));
    this.path = replaceExtname(this.path, extname);
  }
  get extname() {
    assert(this.path, pathError('extname', 'get'));
    return path.extname(this.path);
  }

  set symlink(value) {
    assert(value, '"file.symlink" must be a string.');
    this[kSymlink] = normalize(value);
  }
  get symlink() {
    return this[kSymlink] || null;
  }

  set path(value) {
    assert(typeof value === 'string', '"file.path" must be a string.');
    value = normalize(value);
    if (value && value !== this.path) {
      this.history.push(value);
    }
  }
  get path() {
    return this.history[this.history.length - 1] || null;
  }

  set absolute(value) {
    throw new Error('"file.absolute" is a getter and may not be defined.');
  }
  get absolute() {
    assert(this.path, pathError('absolute', 'get'));
    return path.resolve(this.cwd, this.path);
  }

  set relative(value) {
    throw new Error('"file.relative" is a getter and may not be defined.');
  }
  get relative() {
    assert(this.path, pathError('relative', 'get'));
    return path.relative(this.base, this.absolute);
  }

  set realpath(value) {
    throw new Error('"file.realpath" is a getter and may not be defined.');
  }
  get realpath() {
    assert(this.path, pathError('realpath', 'get'));
    try {
      return fs.realpathSync(this.absolute);
    } catch (err) {
      /* ignore error */
      return null;
    }
  }

  [util.inspect.custom]() {
    const filepath = this.path ? (!this.relative.includes('../') ? this.relative : this.absolute) : null;
    const inspect = filepath ? [`"${filepath}"`] : [];
    if (this.isBuffer()) {
      inspect.push(this.contents.inspect());
    }
    if (this.isStream()) {
      const name = this.contents.constructor.name;
      const suffix = name.endsWith('Stream') ? '' : 'Stream';
      inspect.push(`<${name === 'Class' ? '' : name}${suffix}>`);
    }
    return `<Dirent ${inspect.join(' ')}>`;
  }

  static isValidContents(value) {
    return value === null || isBuffer(value) || isStream(value);
  }
}

module.exports = Dirent;
