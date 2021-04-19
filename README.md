# dirent [![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/jonathanschlinkert?locale.x=en_US) [![NPM version](https://img.shields.io/npm/v/dirent.svg?style=flat)](https://www.npmjs.com/package/dirent) [![NPM monthly downloads](https://img.shields.io/npm/dm/dirent.svg?style=flat)](https://npmjs.org/package/dirent) [![NPM total downloads](https://img.shields.io/npm/dt/dirent.svg?style=flat)](https://npmjs.org/package/dirent) [![Tests](https://github.com/folder/dirent/actions/workflows/test.yml/badge.svg)](https://github.com/folder/dirent/actions/workflows/test.yml)

> Virtual file class. Extends the native fs.Dirent class with methods to simplify path handling. Similar to Vinyl, but lightweight.

Please consider following this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), and consider starring the project to show your :heart: and support.

## Install

Install with [npm](https://www.npmjs.com/) (requires [Node.js](https://nodejs.org/en/) >=10):

```sh
$ npm install --save dirent
```

## Credit

This library is very heavily based on [Vinyl](https://github.com/gulpjs/vinyl). Thank you to the [gulp.js](https://github.com/gulpjs) team for the inspiration and great ideas behind vinyl. This work is based on that.

## Comparison to Vinyl

The API for path handling is close enough that you can use Vinyl's docs as a reference. There are only a couple of minor differences:

1. Streams are not supported on `file.contents` by default. See how to [add stream support](#how-to-add-stream-support).
2. Dirent extends Node's native [fs.Dirent](https://nodejs.org/api/fs.html#fs_class_fs_dirent) class.
3. You can pass a string or object as the first argument, and optionally a [file type](https://nodejs.org/api/fs.html#fs_file_type_constants) as the second argument.

## Usage

```js
const Dirent = require('dirent');

// Pass a file path as a string, or an object with properties to add to the dirent
// The following examples are equivalent. When the path is a string, it will
// be converted to an object and set on the dirent.path property.
console.log(new Dirent('some/file/path.txt'));
//=> <Dirent "some/file/path.txt">
console.log(new Dirent({ path: 'some/file/path.txt' }));
//=> <Dirent "some/file/path.txt">

// assuming __filename is /jonschlinkert/dev/dirent/index.js
const file = new Dirent(__filename);
console.log(file.dirname); //=> /Users/jonschlinkert/dev//dirent
console.log(file.basename); //=> example.js
console.log(file.stem); //=> example
console.log(file.extname); //=> .js
```

## How to add stream support

Stream support is added using the [cloneable-readable](https://github.com/mcollina/cloneable-readable) library (this is the same library used by Vinyl). To add support for streams, do the following:

```js
const clonable = require('cloneable-readable');
const Dirent = require('dirent');
const File = Dirent.create(cloneable);

const file = new File({ path: 'foo.js' });
```

## About

<details>
<summary><strong>Contributing</strong></summary>

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](.github/contributing.md) for advice on opening issues, pull requests, and coding standards.

</details>

<details>
<summary><strong>Running Tests</strong></summary>

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

</details>

<details>
<summary><strong>Building docs</strong></summary>

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

</details>

### Contributors

| **Commits** | **Contributor** |  
| --- | --- |  
| 19 | [jonschlinkert](https://github.com/jonschlinkert) |  
| 2  | [doowb](https://github.com/doowb) |  

### Author

**Jon Schlinkert**

* [GitHub Profile](https://github.com/jonschlinkert)
* [Twitter Profile](https://twitter.com/jonschlinkert)
* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)

### License

Copyright © 2021, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the MIT License.

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.8.0, on April 18, 2021._