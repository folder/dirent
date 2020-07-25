'use strict';

require('mocha');
const fs = require('fs');
const assert = require('assert').strict;
const cloneable = require('cloneable-readable');
const concat = require('concat-stream');
const from = require('from2');
const pipe = require('pump');
const Dirent = require('..');

describe('Dirent', () => {
  it('should create a Dirent instance', () => {
    assert(new Dirent() instanceof Dirent);
  });

  it('should add stream support', () => {
    const options = {
      cwd: '/',
      base: '/test/',
      path: '/test/test.coffee',
      contents: from(['wa', 'dup'])
    };

    const File = Dirent.create(cloneable);
    const file = new File(options);
    assert.equal(file.isStream(), true);

    const file2 = file.clone();

    assert(file2 !== file);
    assert.equal(file2.cwd, file.cwd);
    assert.equal(file2.base, file.base);
    assert.equal(file2.path, file.path);
    assert(file2.contents !== file.contents);

    let ends = 2;
    let data = null;
    let output = null;

    function compare(err) {
      if (err) {
        cb(err);
        return;
      }

      if (--ends === 0) {
        assert(data !== output);
        assert.equal(data.toString(), output.toString());
        cb();
      }
    }

    pipe([
      file.contents,
      concat(function(d) {
        data = d;
      })
    ], compare);

    pipe([
      file2.contents,
      concat(function(d) {
        output = d;
      })
    ], compare);
  });

  it('should set dirent.path when value is an object', () => {
    const dirent = new Dirent({ path: __filename });
    assert.equal(dirent.path, __filename);
  });

  it('should return false on all `is*` methods by default', () => {
    const dirent = new Dirent({ path: __filename });
    assert.equal(dirent.isDirectory(), false);
    assert.equal(dirent.isFile(), false);
    assert.equal(dirent.isBlockDevice(), false);
    assert.equal(dirent.isCharacterDevice(), false);
    assert.equal(dirent.isSymbolicLink(), false);
    assert.equal(dirent.isFIFO(), false);
    assert.equal(dirent.isSocket(), false);
  });

  it('should accept `type` integer as the second argument', () => {
    assert.equal(new Dirent({ path: __dirname }, 2).isFile(), false);
    assert.equal(new Dirent({ path: __dirname }, 2).isDirectory(), true);
    assert.equal(new Dirent({ path: __filename }, 1).isDirectory(), false);
    assert.equal(new Dirent({ path: __filename }, 1).isFile(), true);
  });

  it('should get type from dirent.stat object passed on constructor', () => {
    const fileStat = fs.statSync(__filename);
    const dirStat = fs.statSync(__dirname);

    assert.equal(new Dirent({ path: __dirname }).isDirectory(), false);
    assert.equal(new Dirent({ path: __filename }).isFile(), false);

    assert.equal(new Dirent({ path: __filename, stat: dirStat }).isDirectory(), true);
    assert.equal(new Dirent({ path: __dirname, stat: fileStat }).isFile(), true);
  });

  it('should call type function from dirent.stat object when set directly', () => {
    const dirStat = fs.statSync(__dirname);
    const fileStat = fs.statSync(__filename);

    const dir = new Dirent({ path: __dirname });
    const file = new Dirent({ path: __filename });

    assert.equal(dir.isDirectory(), false);
    assert.equal(file.isFile(), false);

    dir.stat = dirStat;
    file.stat = fileStat;

    assert.equal(dir.isDirectory(), true);
    assert.equal(file.isFile(), true);
  });

  it('should get `mode` from dirent.stat object when set directly', () => {
    const dirStat = fs.statSync(__dirname);
    const fileStat = fs.statSync(__filename);

    const dir = new Dirent({ path: __dirname });
    const file = new Dirent({ path: __filename });

    assert.equal(dir.mode, undefined);
    assert.equal(file.mode, undefined);

    dir.stat = dirStat;
    file.stat = fileStat;

    assert.equal(dir.mode, dir.stat.mode);
    assert.equal(file.mode, file.stat.mode);
  });
});
