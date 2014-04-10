/*global process*/
if (process.env.COVERAGE) {
    require('../lib-cov/knockout.observableSortedArray');
} else {
    require('../lib/knockout.observableSortedArray');
}
this.expect = require('unexpected');
