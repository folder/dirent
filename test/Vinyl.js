'use strict';

const { isPrototypeOf } = Object;
const isWin = process.platform === 'win32';
const fs = require('fs');
const path = require('path');
const util = require('util');
const assert = require('assert').strict;
const concat = require('concat-stream');
const from = require('from2');
const pipe = require('pump');
const File = require('..').create(require('cloneable-readable'));

/**
 * Tests from Vinyl. Most stream tests were removed.
 */

describe('File', () => {
  describe('defaults', () => {
    it('defaults cwd to process.cwd', () => {
      const file = new File();
      assert.equal(file.cwd, process.cwd());
    });

    it('defaults base to process.cwd', () => {
      const file = new File();
      assert.equal(file.base, process.cwd());
    });

    it('defaults base to cwd property', () => {
      const cwd = path.normalize('/');
      const file = new File({ cwd: cwd });
      assert.equal(file.base, cwd);
    });

    it('defaults path to null', () => {
      const file = new File();
      assert.equal(file.path, null);
    });

    it('defaults history to an empty array', () => {
      const file = new File();
      assert.equal(file.history.length, 0);
    });

    it('defaults stat to null', () => {
      const file = new File();
      assert.equal(file.stat, null);
    });

    it('defaults contents to null', () => {
      const file = new File();
      assert.equal(file.contents, null);
    });
  });

  describe('constructor()', () => {
    it('sets base', () => {
      const val = path.normalize('/');
      const file = new File({ base: val });
      assert.equal(file.base, val);
    });

    it('sets cwd', () => {
      const val = path.normalize('/');
      const file = new File({ cwd: val });
      assert.equal(file.cwd, val);
    });

    it('sets path (and history)', () => {
      const filepath = path.normalize('/test.coffee');
      const file = new File({ path: filepath });
      assert.equal(file.path, filepath);
      assert.equal(file.history[0], filepath);
    });

    it('sets history (and path)', () => {
      const val = path.normalize('/test.coffee');
      const file = new File({ history: [val] });
      assert.equal(file.path, val);
      assert.equal(file.history[0], val);
    });

    it('sets stat', () => {
      const val = {};
      const file = new File({ stat: val });
      assert.equal(file.stat, val);
    });

    it('sets contents', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val });
      assert.equal(file.contents, val);
    });

    it('sets custom properties', () => {
      const sourceMap = {};
      const file = new File({ sourceMap });
      assert.equal(file.sourceMap, sourceMap);
    });

    it('normalizes path', () => {
      const val = '/test/foo/../test.coffee';
      const expected = path.normalize(val);
      const file = new File({ path: val });

      assert.equal(file.path, expected);
      assert.equal(file.history[0], expected);
    });

    it('normalizes and removes trailing separator from path', () => {
      const val = '/test/foo/../foo/';
      const expected = path.normalize(val.slice(0, -1));
      const file = new File({ path: val });
      assert.equal(file.path, expected);
    });

    it('normalizes history', () => {
      const val = [
        '/test/bar/../bar/test.coffee',
        '/test/foo/../test.coffee'
      ];

      const expected = val.map(fp => path.normalize(fp));
      const file = new File({ history: val });

      assert.equal(file.path, expected[1]);
      assert.equal(file.history[0], expected[0]);
    });

    it('normalizes and removes trailing separator from history', () => {
      const val = [
        '/test/foo/../foo/',
        '/test/bar/../bar/'
      ];

      const expected = val.map(fp =>  path.normalize(fp.slice(0, -1)));
      const file = new File({ history: val });
      assert.equal(file.history.join(''), expected.join(''));
    });

    it('appends path to history if both exist and different from last', () => {
      const val = path.normalize('/test/baz/test.coffee');
      const history = [
        path.normalize('/test/bar/test.coffee'),
        path.normalize('/test/foo/test.coffee')
      ];
      const file = new File({ path: val, history: history });

      const expectedHistory = history.concat(val);

      assert.equal(file.path, val);
      assert.equal(file.history.join(''), expectedHistory.join(''));
    });

    it('does not append path to history if both exist and same as last', () => {
      const val = path.normalize('/test/baz/test.coffee');
      const history = [
        path.normalize('/test/bar/test.coffee'),
        path.normalize('/test/foo/test.coffee'),
        val
      ];

      const file = new File({ path: val, history: history });
      assert.equal(file.path, val);
      assert.equal(file.history.join(''), history.join(''));
    });

    it('does not mutate history array passed in', () => {
      const val = path.normalize('/test/baz/test.coffee');
      const history = [
        path.normalize('/test/bar/test.coffee'),
        path.normalize('/test/foo/test.coffee')
      ];

      const historyCopy = [].concat(history);
      const file = new File({ path: val, history });

      const expectedHistory = history.concat(val);

      assert.equal(file.path, val);
      assert.equal(file.history.join(''), expectedHistory.join(''));
      assert.equal(history.join(''), historyCopy.join(''));
    });
  });

  describe('isBuffer()', () => {
    it('returns true when the contents are a Buffer', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val });
      assert.equal(file.isBuffer(), true);
    });

    it('returns false when the contents are a Stream', () => {
      const val = from([]);
      const file = new File({ contents: val });
      assert.equal(file.isBuffer(), false);
    });

    it('returns false when the contents are null', () => {
      const file = new File({ contents: null });
      assert.equal(file.isBuffer(), false);
    });
  });

  describe('isStream()', () => {
    it('returns false when the contents are a Buffer', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val });
      assert.equal(file.isStream(), false);
    });

    it('returns true when the contents are a Stream', () => {
      const val = from([]);
      const file = new File({ contents: val });
      assert.equal(file.isStream(), true);
    });

    it('returns false when the contents are null', () => {
      const file = new File({ contents: null });
      assert.equal(file.isStream(), false);
    });
  });

  describe('isNull()', () => {
    it('returns false when the contents are a Buffer', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val });
      assert.equal(file.isNull(), false);
    });

    it('returns false when the contents are a Stream', () => {
      const val = from([]);
      const file = new File({ contents: val });
      assert.equal(file.isNull(), false);
    });

    it('returns true when the contents are null', () => {
      const file = new File({ contents: null });
      assert.equal(file.isNull(), true);
    });
  });

  describe('isDirectory()', () => {
    const fakeStat = {
      isDirectory() {
        return true;
      }
    };

    it('returns false when the contents are a Buffer', () => {
      const contents = Buffer.from('test');
      const file = new File({ contents, stat: fakeStat });
      assert.equal(file.isDirectory(), false);
    });

    it('returns false when the contents are a Stream', () => {
      const file = new File({ contents: from([]), stat: fakeStat });
      assert.equal(file.isDirectory(), false);
    });

    it('returns true when the contents are null & stat.isDirectory is true', () => {
      const file = new File({ contents: null, stat: fakeStat });
      assert.equal(file.isDirectory(), true);
    });

    it('returns false when stat exists but does not contain an isDirectory method', () => {
      const file = new File({ contents: null, stat: {} });
      assert.equal(file.isDirectory(), false);
    });

    it('returns false when stat does not exist', () => {
      const file = new File({ contents: null });
      assert.equal(file.isDirectory(), false);
    });
  });

  describe('isSymbolic()', () => {
    const fakeStat = {
      isSymbolicLink() {
        return true;
      }
    };

    it('returns false when the contents are a Buffer', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val, stat: fakeStat });
      assert.equal(file.isSymbolic(), false);
    });

    it('returns false when the contents are a Stream', () => {
      const val = from([]);
      const file = new File({ contents: val, stat: fakeStat });
      assert.equal(file.isSymbolic(), false);
    });

    it('returns true when the contents are null & stat.isSymbolicLink is true', () => {
      const file = new File({ contents: null, stat: fakeStat });
      assert.equal(file.isSymbolic(), true);
    });

    it('returns false when stat exists but does not contain an isSymbolicLink method', () => {
      const file = new File({ contents: null, stat: {} });
      assert.equal(file.isSymbolic(), false);
    });

    it('returns false when stat does not exist', () => {
      const file = new File({ contents: null });
      assert.equal(file.isSymbolic(), false);
    });
  });

  describe('inspect()', () => {
    it('returns correct format when no contents and no path', () => {
      const file = new File();
      const expectation = '<Dirent >';
      assert.equal(file.inspect(), expectation);
      assert.equal(util.inspect(file), expectation);
      if (util.inspect.custom) {
        assert.equal(file[util.inspect.custom](), expectation);
      }
    });

    it('returns correct format when Buffer contents and no path', () => {
      const val = Buffer.from('test');
      const file = new File({ contents: val });
      assert.equal(file.inspect(), '<Dirent <Buffer 74 65 73 74>>');
    });

    it('returns correct format when Buffer contents and relative path', () => {
      const val = Buffer.from('test');
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: val
      });
      assert.equal(file.inspect(), '<Dirent "test.coffee" <Buffer 74 65 73 74>>');
    });

    it('returns correct format when Stream contents and relative path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: from([])
      });

      assert.equal(file.inspect(), '<Dirent "test.coffee" <CloneableStream>>');
    });

    it('returns correct format when null contents and relative path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: null
      });

      assert.equal(file.inspect(), '<Dirent "test.coffee">');
    });
  });

  describe('cwd get/set', () => {
    it('returns cwd', () => {
      const val = '/test';
      const file = new File();
      file.cwd = val;
      assert.equal(file.cwd, val);
    });

    it('sets cwd', () => {
      const val = '/test';
      const file = new File();
      file.cwd = val;
      assert.equal(file.cwd, path.normalize(val));
    });

    it('normalizes and removes trailing separator on set', () => {
      const val = '/test/foo/../foo/';
      const expected = path.normalize(val.slice(0, -1));
      const file = new File();

      file.cwd = val;

      assert.equal(file.cwd, expected);

      const val2 = '\\test\\foo\\..\\foo\\';
      const expected2 = path.normalize(isWin ? val2.slice(0, -1) : val2);

      file.cwd = val2;
      assert.equal(file.cwd, expected2);
    });

    it('throws on set with invalid values', () => {
      const invalidValues = [
        '',
        null,
        undefined,
        true,
        false,
        0,
        Infinity,
        NaN,
        {},
        []
      ];
      const file = new File();

      invalidValues.forEach(function(val) {
        function invalid() {
          file.cwd = val;
        }
        assert.throws(invalid, 'cwd must be a non-empty string.');
      });

    });
  });

  describe('base get/set', () => {

    it('proxies cwd when omitted', () => {
      const file = new File({ cwd: '/test' });
      assert.equal(file.base, file.cwd);
    });

    it('proxies cwd when same', () => {
      const file = new File({
        cwd: '/test',
        base: '/test'
      });
      file.cwd = '/foo/';
      assert.equal(file.base, file.cwd);

      const file2 = new File({
        cwd: '/test'
      });
      file2.base = '/test/';
      file2.cwd = '/foo/';
      assert.equal(file2.base, file.cwd);
    });

    it('proxies to cwd when set to same value', () => {
      const file = new File({
        cwd: '/foo',
        base: '/bar'
      });
      assert(file.base !== file.cwd);
      file.base = file.cwd;
      assert.equal(file.base, file.cwd);
    });

    it('proxies to cwd when null or undefined', () => {
      const file = new File({
        cwd: '/foo',
        base: '/bar'
      });
      assert(file.base !== file.cwd);
      file.base = null;
      assert.equal(file.base, file.cwd);
      file.base = '/bar/';
      assert(file.base !== file.cwd);
      file.base = undefined;
      assert.equal(file.base, file.cwd);
    });

    it('returns base', () => {
      const base = '/test/';
      const file = new File();
      file.base = base;
      assert.equal(file.base, base.slice(0, -1));
    });

    it('sets base', () => {
      const val = '/test/foo';
      const file = new File();
      file.base = val;
      assert.equal(file.base, path.normalize(val));
    });

    it('normalizes and removes trailing separator on set', () => {
      const val = '/test/foo/../foo/';
      const expected = path.normalize(val.slice(0, -1));
      const file = new File();

      file.base = val;

      assert.equal(file.base, expected);

      const val2 = '\\test\\foo\\..\\foo\\';
      const expected2 = path.normalize(isWin ? val2.slice(0, -1) : val2);

      file.base = val2;

      assert.equal(file.base, expected2);
    });

    it('throws on set with invalid values', () => {
      const invalidValues = [
        true,
        false,
        1,
        0,
        Infinity,
        NaN,
        '',
        {},
        []
      ];
      const file = new File();

      invalidValues.forEach(function(val) {
        function invalid() {
          file.base = val;
        }
        assert.throws(invalid, 'base must be a non-empty string, or null/undefined.');
      });

    });
  });

  describe('clone()', () => {
    it('copies all attributes over with Buffer contents', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: Buffer.from('test')
      };
      const file = new File(options);
      const file2 = file.clone();

      assert(file2 !== file);
      assert.equal(file2.cwd, file.cwd);
      assert.equal(file2.base, file.base);
      assert.equal(file2.path, file.path);
      assert(file2.contents !== file.contents);
      assert.equal(file2.contents.toString(), file.contents.toString());
      cb();
    });

    it('assigns Buffer content reference when contents option is false', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.js',
        contents: Buffer.from('test')
      };
      const file = new File(options);

      const copy1 = file.clone({ contents: false });
      assert(copy1.contents, file.contents);

      const copy2 = file.clone();
      assert(copy2.contents !== file.contents);

      const copy3 = file.clone({ contents: 'invalid' });
      assert(copy3.contents !== file.contents);
      cb();
    });

    it('copies all attributes over with Stream contents', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: from(['wa', 'dup'])
      };

      const file = new File(options);
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

    it('does not start flowing until all clones flows (data)', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: from(['wa', 'dup'])
      };
      const file = new File(options);
      const file2 = file.clone();
      let ends = 2;

      let data = '';
      let output = '';

      function compare() {
        if (--ends === 0) {
          assert.equal(data, output);
          cb();
        }
      }

      // Start flowing file2
      file2.contents.on('data', function(chunk) {
        output += chunk.toString();
      });

      process.nextTick(() => {
        // Nothing was written yet
        assert.equal(data, '');
        assert.equal(output, '');

        // Starts flowing file
        file.contents.on('data', function(chunk) {
          data += chunk.toString();
        });
      });

      file2.contents.on('end', compare);
      file.contents.on('end', compare);
    });

    it('does not start flowing until all clones flow (readable)', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: from(['wa', 'dup'])
      };
      const file = new File(options);
      const file2 = file.clone();

      let output = '';

      function compare(data) {
        assert.equal(data.toString(), output);
      }

      // Start flowing file2
      file2.contents.on('readable', function() {
        let chunk;
        while ((chunk = this.read()) !== null) {
          output += chunk.toString();
        }
      });

      pipe([file.contents, concat(compare)], cb);
    });

    it('copies all attributes over with null contents', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: null
      };
      const file = new File(options);
      const file2 = file.clone();

      assert(file2 !== file);
      assert.equal(file2.cwd, file.cwd);
      assert.equal(file2.base, file.base);
      assert.equal(file2.path, file.path);
      assert.equal(file2.contents, null);
      cb();
    });

    it('properly clones the `stat` property', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.js',
        contents: Buffer.from('test'),
        stat: fs.statSync(__filename)
      };

      const file = new File(options);
      const copy = file.clone();

      assert.equal(copy.stat.isFile(), true);
      assert.equal(copy.stat.isDirectory(), false);
      assert(file.stat instanceof fs.Stats);
      assert(copy.stat instanceof fs.Stats);
      cb();
    });

    it('properly clones the `history` property', () => {
      const options = {
        cwd: path.normalize('/'),
        base: path.normalize('/test/'),
        path: path.normalize('/test/test.js'),
        contents: Buffer.from('test')
      };

      const file = new File(options);
      const copy = file.clone();

      assert.equal(copy.history[0], options.path);
      copy.path = 'lol';
      assert(file.path !== copy.path);
    });

    it('copies custom properties', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: null,
        custom: { meta: {} }
      };

      const file = new File(options);
      const file2 = file.clone();

      assert(file2 !== file);
      assert.equal(file2.cwd, file.cwd);
      assert.equal(file2.base, file.base);
      assert.equal(file2.path, file.path);
      assert(file2.custom !== file.custom);
      assert(file2.custom.meta !== file.custom.meta);
      assert.deepEqual(file2.custom, file.custom);
      cb();
    });

    it('copies history', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: null
      };
      const history = [
        path.normalize('/test/test.coffee'),
        path.normalize('/test/test.js'),
        path.normalize('/test/test-938di2s.js')
      ];

      const file = new File(options);
      file.path = history[1];
      file.path = history[2];
      const file2 = file.clone();

      assert.deepEqual(file2.history, history);
      assert(file2.history !== file.history);
      assert.equal(file2.path, history[2]);
      cb();
    });

    it('supports deep & shallow copy of all attributes', cb => {
      const options = {
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee',
        contents: null,
        custom: { meta: {} }
      };

      const file = new File(options);

      const file2 = file.clone();
      assert.equal(file2.custom.toString(), file.custom.toString());
      assert(file2.custom !== file.custom);
      assert.deepEqual(file2.custom.meta, file.custom.meta);
      assert(file2.custom.meta !== file.custom.meta);

      const file3 = file.clone(true);
      assert.deepEqual(file3.custom, file.custom);
      assert(file3.custom !== file.custom);
      assert.deepEqual(file3.custom.meta, file.custom.meta);
      assert(file3.custom.meta !== file.custom.meta);

      const file4 = file.clone({ deep: true });
      assert.deepEqual(file4.custom, file.custom);
      assert(file4.custom !== file.custom);
      assert.deepEqual(file4.custom.meta, file.custom.meta);
      assert(file4.custom.meta !== file.custom.meta);

      const file5 = file.clone(false);
      assert.deepEqual(file5.custom, file.custom);
      assert(file5.custom, file.custom);
      assert.deepEqual(file5.custom.meta, file.custom.meta);
      assert(file.custom.meta, file.custom.meta);

      const file6 = file.clone({ deep: false });
      assert.deepEqual(file6.custom, file.custom);
      assert(file6.custom, file.custom);
      assert.deepEqual(file6.custom.meta, file.custom.meta);
      assert(file.custom.meta, file.custom.meta);

      cb();
    });

    it('supports inheritance', () => {
      class ExtendedFile extends File {}

      const file = new ExtendedFile();
      const file2 = file.clone();

      assert(file2 !== file);
      assert(file2.constructor, ExtendedFile);
      assert(file2 instanceof ExtendedFile);
      assert(file2 instanceof File);
      assert.equal(isPrototypeOf.call(ExtendedFile.prototype, file2), true);
      assert.equal(isPrototypeOf.call(File.prototype, file2), true);
    });
  });

  describe('relative get/set', () => {
    it('throws on set', () => {
      const file = new File();

      function invalid() {
        file.relative = 'test';
      }

      assert.throws(invalid, /may not be defined/);
    });

    it('throws on get with no path', () => {
      const file = new File();

      function invalid() {
        return file.relative;
      }

      assert.throws(invalid, 'No path specified! Cannot get relative.');
    });

    it('returns a relative path from base', () => {
      const file = new File({
        base: '/test/',
        path: '/test/test.coffee'
      });

      assert.equal(file.relative, 'test.coffee');
    });

    it('returns a relative path from cwd', () => {
      const file = new File({
        cwd: '/',
        path: '/test/test.coffee'
      });

      assert.equal(file.relative, path.normalize('test/test.coffee'));
    });

    it('does not append separator when directory', () => {
      const file = new File({
        base: '/test',
        path: '/test/foo/bar',
        stat: {
          isDirectory() {
            return true;
          }
        }
      });

      assert.equal(file.relative, path.normalize('foo/bar'));
    });

    it('does not append separator when symlink', () => {
      const file = new File({
        base: '/test',
        path: '/test/foo/bar',
        stat: {
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.relative, path.normalize('foo/bar'));
    });

    it('does not append separator when directory & symlink', () => {
      const file = new File({
        base: '/test',
        path: '/test/foo/bar',
        stat: {
          isDirectory() {
            return true;
          },
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.relative, path.normalize('foo/bar'));
    });
  });

  describe('dirname get/set', () => {

    it('throws on get with no path', () => {
      const file = new File();

      function invalid() {
        return file.dirname;
      }

      assert.throws(invalid, 'No path specified! Can not get dirname.');
    });

    it('returns the dirname without trailing separator', () => {
      const file = new File({
        cwd: '/',
        base: '/test',
        path: '/test/test.coffee'
      });

      assert.equal(file.dirname, path.normalize('/test'));
    });

    it('throws on set with no path', () => {
      const file = new File();

      function invalid() {
        file.dirname = '/test';
      }

      assert.throws(invalid, 'No path specified! Can not set dirname.');
    });

    it('replaces the dirname of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      file.dirname = '/test/foo';
      assert.equal(file.path, path.normalize('/test/foo/test.coffee'));
    });
  });

  describe('basename get/set', () => {

    it('throws on get with no path', () => {
      const file = new File();

      function invalid() {
        return file.basename;
      }

      assert.throws(invalid, 'No path specified! Can not get basename.');
    });

    it('returns the basename of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      assert.equal(file.basename, 'test.coffee');
    });

    it('does not append trailing separator when directory', () => {
      const file = new File({
        path: '/test/foo',
        stat: {
          isDirectory() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('does not append trailing separator when symlink', () => {
      const file = new File({
        path: '/test/foo',
        stat: {
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('does not append trailing separator when directory & symlink', () => {
      const file = new File({
        path: '/test/foo',
        stat: {
          isDirectory() {
            return true;
          },
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('removes trailing separator', () => {
      const file = new File({
        path: '/test/foo/'
      });

      assert.equal(file.basename, 'foo');
    });

    it('removes trailing separator when directory', () => {
      const file = new File({
        path: '/test/foo/',
        stat: {
          isDirectory() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('removes trailing separator when symlink', () => {
      const file = new File({
        path: '/test/foo/',
        stat: {
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('removes trailing separator when directory & symlink', () => {
      const file = new File({
        path: '/test/foo/',
        stat: {
          isDirectory() {
            return true;
          },
          isSymbolicLink() {
            return true;
          }
        }
      });

      assert.equal(file.basename, 'foo');
    });

    it('throws on set with no path', () => {
      const file = new File();

      function invalid() {
        file.basename = 'test.coffee';
      }

      assert.throws(invalid, 'No path specified! Can not set basename.');
    });

    it('replaces the basename of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      file.basename = 'foo.png';
      assert.equal(file.path, path.normalize('/test/foo.png'));
    });
  });

  describe('stem get/set', () => {

    it('throws on get with no path', () => {
      const file = new File();

      function invalid() {
        return file.stem;
      }

      assert.throws(invalid, 'No path specified! Can not get stem.');
    });

    it('returns the stem of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      assert.equal(file.stem, 'test');
    });

    it('throws on set with no path', () => {
      const file = new File();

      function invalid() {
        file.stem = 'test.coffee';
      }

      assert.throws(invalid, 'No path specified! Can not set stem.');
    });

    it('replaces the stem of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      file.stem = 'foo';
      assert.equal(file.path, path.normalize('/test/foo.coffee'));
    });
  });

  describe('extname get/set', () => {

    it('throws on get with no path', () => {
      const file = new File();

      function invalid() {
        return file.extname;
      }

      assert.throws(invalid, 'No path specified! Can not get extname.');
    });

    it('returns the extname of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      assert.equal(file.extname, '.coffee');
    });

    it('throws on set with no path', () => {
      const file = new File();

      function invalid() {
        file.extname = '.coffee';
      }

      assert.throws(invalid, 'No path specified! Can not set extname.');
    });

    it('replaces the extname of the path', () => {
      const file = new File({
        cwd: '/',
        base: '/test/',
        path: '/test/test.coffee'
      });

      file.extname = '.png';
      assert.equal(file.path, path.normalize('/test/test.png'));
    });
  });

  describe('path get/set', () => {
    it('records path in history upon instantiation', () => {
      const file = new File({
        cwd: '/',
        path: '/test/test.coffee'
      });

      const history = [
        path.normalize('/test/test.coffee')
      ];

      assert.equal(file.path, history[0]);
      assert.equal(file.history.join(''), history.join(''));
    });

    it('records path in history when set', () => {
      const val = path.normalize('/test/test.js');
      const file = new File({
        cwd: '/',
        path: '/test/test.coffee'
      });
      const history = [
        path.normalize('/test/test.coffee'),
        val
      ];

      file.path = val;
      assert.equal(file.path, val);
      assert.equal(file.history.join(''), history.join(''));

      const val2 = path.normalize('/test/test.es6');
      history.push(val2);

      file.path = val2;
      assert.equal(file.path, val2);
      assert.equal(file.history.join(''), history.join(''));
    });

    it('does not record path in history when set to the current path', () => {
      const val = path.normalize('/test/test.coffee');
      const file = new File({
        cwd: '/',
        path: val
      });
      const history = [
        val
      ];

      file.path = val;
      file.path = val;
      assert.equal(file.path, val);
      assert.equal(file.history.join(''), history.join(''));
    });

    it('does not record path in history when set to empty string', () => {
      const val = path.normalize('/test/test.coffee');
      const file = new File({
        cwd: '/',
        path: val
      });

      const history = [
        val
      ];

      file.path = '';
      assert.equal(file.path, val);
      assert.equal(file.history.join(''), history.join(''));
    });

    it('throws on set with null path', () => {
      const file = new File();

      assert.equal(file.path, null);
      assert.equal(file.history.length, 0);

      function invalid() {
        file.path = null;
      }

      assert.throws(invalid, 'path should be a string.');
    });

    it('normalizes the path upon set', () => {
      const val = '/test/foo/../test.coffee';
      const expected = path.normalize(val);
      const file = new File();

      file.path = val;

      assert.equal(file.path, expected);
      assert.equal(file.history.join(''), expected);
    });

    it('removes the trailing separator upon set', () => {
      const file = new File();
      file.path = '/test/';

      assert.equal(file.path, path.normalize('/test'));
      assert.equal(file.history.join(''), path.normalize('/test'));
    });

    it('removes the trailing separator upon set when directory', () => {
      const file = new File({
        stat: {
          isDirectory() {
            return true;
          }
        }
      });
      file.path = '/test/';

      assert.equal(file.path, path.normalize('/test'));
      assert.equal(file.history.join(''), path.normalize('/test'));
    });

    it('removes the trailing separator upon set when symlink', () => {
      const file = new File({
        stat: {
          isSymbolicLink() {
            return true;
          }
        }
      });
      file.path = '/test/';

      assert.equal(file.path, path.normalize('/test'));
      assert.equal(file.history.join(''), path.normalize('/test'));
    });

    it('removes the trailing separator upon set when directory & symlink', () => {
      const file = new File({
        stat: {
          isDirectory() {
            return true;
          },
          isSymbolicLink() {
            return true;
          }
        }
      });
      file.path = '/test/';

      assert.equal(file.path, path.normalize('/test'));
      assert.equal(file.history.join(''), path.normalize('/test'));
    });
  });

  describe('symlink get/set', () => {
    it('return null on get with no symlink', () => {
      const file = new File();
      assert.equal(file.symlink, null);
    });

    it('returns symlink', () => {
      const val = '/test/test.coffee';
      const file = new File();
      file.symlink = val;

      assert.equal(file.symlink, val);
    });

    it('throws on set with non-string', () => {
      const file = new File();

      function invalid() {
        file.symlink = null;
      }

      assert.throws(invalid, 'symlink should be a string');
    });

    it('sets symlink', () => {
      const val = '/test/test.coffee';
      const expected = path.normalize(val);
      const file = new File();
      file.symlink = val;

      assert.equal(file.symlink, expected);
    });

    it('allows relative symlink', () => {
      const val = 'test.coffee';
      const file = new File();
      file.symlink = val;

      assert.equal(file.symlink, val);
    });

    it('normalizes and removes trailing separator upon set', () => {
      const val = '/test/foo/../bar/';
      const expected = path.normalize(val.slice(0, -1));
      const file = new File();
      file.symlink = val;

      assert.equal(file.symlink, expected);
    });
  });
});
