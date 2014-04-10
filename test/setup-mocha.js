define([
    'mocha'
], function (mocha) {
    mocha.setup('bdd');

    window.defineTest = function (dependencies, test) {
        define(dependencies, function () {
            var args = arguments;
            return function () {
                return test.apply(null, args);
            };
        });
    };
});
