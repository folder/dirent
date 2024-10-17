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
const clone = require('clone-deep');

const {
  builtinProperties,
  handlers,
  isBuffer,
  isStream,
  normalize,
  pathError,
  removeTrailingSep,
  replaceExtname
} = require('./utils');

/**
 * Create the Dirent class by optionally passing a clonable stream.
 */

const create = clonableStream => {
  class Dirent extends fs.Dirent {
    constructor(dirent = {}, type = '') {
      super(null, type, '');

      if (typeof dirent === 'string') {
        dirent = { path: dirent };
      }

      this[kDirent] = dirent;
      this.contents = dirent.contents || null;
      this.stat = dirent.stat || null;

      // replay history to get path normalization
      const history = [].concat(dirent.history || []).concat(dirent.path || []);
      this.history = [];
      history.forEach(value => { this.path = value; });

      this.cwd = dirent.cwd || process.cwd();
      this.base = dirent.base;

      for (const key of Object.keys(dirent)) {
        if (!builtinProperties.has(key)) {
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

    // gulp compat
    isSymbolic() {
      return this.isNull() && this.isSymbolicLink();
    }
    // alias for isSymbolicLink
    isSymlink() {
      return this.isSymbolicLink();
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

    clone(options) {
      if (typeof options === 'boolean') options = { deep: options };
      const opts = { deep: true, contents: true, ...options };

      const { base, cwd } = this;
      const history = this.history.slice();
      const stat = this.stat ? Object.assign(new fs.Stats(), this.stat) : null;

      const contents = (opts.contents && this.isBuffer())
        ? Buffer.from(this.contents)
        : ((this.isStream() && this.contents.clone) ? this.contents.clone() : this.contents);

      const file = new this.constructor({ cwd, base, stat, history, contents });

      for (const key of Object.keys(this)) {
        if (!builtinProperties.has(key)) {
          file[key] = opts.deep ? clone(this[key], true) : this[key];
        }
      }

      return file;
    }

    set contents(value) {
      assert(this.constructor.isValidContents(value), 'Expected file.contents to be a Buffer, Stream, or null.');
      if (clonableStream && isStream(value) && !clonableStream.isCloneable(value)) {
        value = clonableStream(value);
      }
      this[kContents] = value;
    }
    get contents() {
      return this[kContents];
    }

    set cwd(cwd) {
      assert(cwd && typeof cwd === 'string', 'file.cwd should be a non-empty string');
      this[kCwd] = removeTrailingSep(normalize(cwd));
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
      value = removeTrailingSep(normalize(value));
      if (value === this[kCwd]) {
        delete this[kBase];
        return;
      }
      this[kBase] = value;
    }
    get base() {
      return this[kBase] || this[kCwd];
    }

    set dirname(value) {
      assert(this.path, pathError('dirname', 'set'));
      this.path = path.join(value, this.basename);
    }
    get dirname() {
      assert(this.path, pathError('dirname', 'get'));
      return path.dirname(this.path);
    }

    set basename(value) {
      assert(this.path, pathError('basename', 'set'));
      this.path = path.join(this.dirname, value);
    }
    get basename() {
      assert(this.path, pathError('basename', 'get'));
      return path.basename(this.path);
    }

    set name(value) {
      if (value && typeof value === 'string') {
        this.basename = value;
      }
    }
    get name() {
      return this.basename;
    }

    set stem(value) {
      assert(this.path, pathError('stem', 'set'));
      this.path = path.join(this.dirname, value + this.extname);
    }
    get stem() {
      assert(this.path, pathError('stem', 'get'));
      return path.basename(this.path, this.extname);
    }

    set extname(value) {
      assert(this.path, pathError('extname', 'set'));
      this.path = replaceExtname(this.path, value);
    }
    get extname() {
      assert(this.path, pathError('extname', 'get'));
      return path.extname(this.path);
    }

    set symlink(value) {
      assert(typeof value === 'string', 'Expected "file.symlink" to be a string.');
      this[kSymlink] = removeTrailingSep(normalize(value));
    }
    get symlink() {
      return this[kSymlink] || null;
    }

    set path(value) {
      assert(typeof value === 'string', 'Expected "file.path" to be a string.');
      value = removeTrailingSep(normalize(value));
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

    static create(clonableStream) {
      return create(clonableStream);
    }
  }

  return Dirent;
};

module.exports = create(/*clonableStream*/);
