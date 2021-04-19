'use strict';

const path = require('path');
const assert = require('assert/strict');
const utils = require('../utils');

describe('normalize()', function() {
  it('leaves empty strings unmodified', () => {
    const result = utils.normalize('');
    assert.equal(result, '');
  });

  it('applies path.normalize for everything else', () => {
    const str = '/foo//../bar/baz';
    const result = utils.normalize(str);
    assert.equal(result, path.normalize(str));
  });
});
