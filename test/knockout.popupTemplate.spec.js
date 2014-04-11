/*global describe, it, beforeEach, afterEach*/
define([
    'unexpected',
    'sinon',
    'jquery',
    'knockout',
    'unexpected-sinon',
    'setup-mocha',
    'knockout.popupTemplate',
    'tpl!templates/popupTemplate.ko',
    'tpl!templates/popupTemplate2.ko',
    'tpl!templates/popupTemplate3.ko'
], function (unexpected, sinon, $, ko, unexpectedSinon) {
    var expect = unexpected.clone();

    expect.installPlugin(unexpectedSinon);

    expect.addAssertion('[not] to be visible', function (expect, subject) {
        var state = this.flags.not ? 'hidden' : 'visible';
        expect($(subject).css('visibility'), 'to be', state);
    });

    expect.addAssertion('[not] to be rendered', function (expect, subject) {
        expect($(subject)[0], '[not] to be truthy');
    });

    describe('popupTemplate', function () {
        var $testElement;

        beforeEach(function () {
            $testElement = $('#test');
        });

        afterEach(function () {
            ko.cleanNode($testElement[0]);
            $testElement.empty();
        });

        function click(selector) {
            var event = $.Event('mousedown', { which: 1 });
            $(selector).trigger(event);
        }


        describe('defaults', function () {
            beforeEach(function () {
                $('<div id="anchor1" data-bind="popupTemplate: \'popupTemplate\'">Popup1</div>').appendTo($testElement);
                $('<div id="anchor2" data-bind="popupTemplate: \'popupTemplate3\'">Popup2</div>').appendTo($testElement);
                var bindingContext = {};
                ko.applyBindings(bindingContext, $testElement[0]);
            });

            it('renders a template in the body tag', function () {
                expect('body>.popupTemplate>#popupTemplate', 'to be rendered');
            });

            it('positions the popup just below the element, aligning left borders', function () {
                var $anchor = $('#anchor1');
                var popupPosition = $('body>.popupTemplate').offset();
                var elementPosition = $anchor.offset();
                expect(popupPosition.left, 'to be', elementPosition.left);
                expect(popupPosition.top, 'to be', elementPosition.top + $anchor.height());
            });

            it('hides the popup element at first', function () {
                expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
            });

            it('shows the popup when element is clicked', function () {
                click('#anchor1');
                expect('body>.popupTemplate>#popupTemplate', 'to be visible');
            });

            it('hides the popup again on click outside popup', function () {
                click('#anchor1'); // Show popup
                click('body'); // Click outside
                expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
            });

            it('works even with many open/closes', function () {
                for (var i = 0; i < 20; i += 1) {
                    click('#anchor1'); // Show popup
                    expect('body>.popupTemplate>#popupTemplate', 'to be visible');
                    click('body'); // Click outside
                    expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
                }
            });

            it('does not hide on click within the popup', function () {
                click('#anchor1'); // Show popup
                click('body>.popupTemplate>#popupTemplate'); // Click inside popup
                expect('body>.popupTemplate>#popupTemplate', 'to be visible');
            });

            it('closes when a click hits another popup anchor', function () {
                expect('body>.popupTemplate>#popupTemplate3', 'to be rendered');
                click('#anchor1'); // Show popup
                expect('body>.popupTemplate>#popupTemplate', 'to be visible');
                click('#anchor2'); // Show popup
                expect('body>.popupTemplate>#popupTemplate3', 'to be visible');
                expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
            });

            it('closes when clicked inside an iframe', function () {
                var $iframe = $('<iframe>');
                $testElement.append($iframe);
                var $iframeBody = $iframe.contents().find('body');
                $iframeBody.append('<div id="clicktarget">');
                click('#anchor1'); // Show popup
                expect('body>.popupTemplate>#popupTemplate', 'to be visible');
                click($iframeBody.find('#clicktarget')); // Click in iframe
                expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
            });

            it("... even when it's the second iframe", function () {
                var $iframe = $('<iframe>');
                $testElement.append($iframe);
                $iframe = $('<iframe>');
                $testElement.append($iframe);
                var $iframeBody = $iframe.contents().find('body');
                $iframeBody.append('<div id="clicktarget">');
                click('#anchor1'); // Show popup
                expect('body>.popupTemplate>#popupTemplate', 'to be visible');
                click($iframeBody.find('#clicktarget')); // Click in iframe
                expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
            });

            it('works even with many open/closes @slow', function () {
                var $iframe = $('<iframe>');
                $testElement.append($iframe);
                var $iframeBody = $iframe.contents().find('body');
                $iframeBody.append('<div id="clicktarget">');
                for (var i = 0; i < 20; i += 1) {
                    click('#anchor1'); // Show popup
                    expect('body>.popupTemplate>#popupTemplate', 'to be visible');
                    click($iframeBody.find('#clicktarget')); // Click in iframe
                    expect('body>.popupTemplate>#popupTemplate', 'not to be visible');
                }
            });
        });

        describe('configurations', function () {
            describe('config objects and data models', function () {
                beforeEach(function () {
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate2',
                            data: {
                                testText: 'This is a test'
                            }
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });

                it('can accept a configuration object', function () {
                    expect('body>.popupTemplate>#popupTemplate', 'to be rendered');
                });

                it('renders the template with the given data model', function () {
                    expect($('body>.popupTemplate>#popupTemplate').html(), 'to be', 'This is a test');
                });
            });

            describe('render on open', function () {
                beforeEach(function () {
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate2',
                            data: {
                                testText: 'This is a test'
                            },
                            renderOnOpen: true
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });

                it('does not render the popup before opening', function () {
                    expect('body>.popupTemplate>#popupTemplate', 'not to be rendered');
                });

                it('renders and shows the popup when element is clicked', function () {
                    click('#test>div');
                    expect('body>.popupTemplate>#popupTemplate', 'to be rendered');
                });

                it('removes the popup when element is closed again', function () {
                    click('#test>div'); // Show popup
                    click('body'); // Click outside
                    expect('body>.popupTemplate>#popupTemplate', 'not to be rendered');
                });

                it('works even with many open/closes', function () {
                    for (var i = 0; i < 20; i += 1) {
                        click('#test>div'); // Show popup
                        expect('body>.popupTemplate>#popupTemplate', 'to be rendered');
                        click('body'); // Click outside
                        expect('body>.popupTemplate>#popupTemplate', 'not to be rendered');
                    }
                });
            });

            describe('state observable', function () {
                var popupState;
                beforeEach(function () {
                    popupState = ko.observable();
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate',
                            openState: popupState
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });

                it('sets the state observable to false initially', function () {
                    expect(popupState(), 'to be false');
                });

                it('sets the state observable to true when opening the popup', function () {
                    click('#test>div'); // Show popup
                    expect(popupState(), 'to be true');
                });

                it('resets the state observable to false when closing the popup', function () {
                    click('#test>div'); // Show popup
                    click('body'); // Click outside
                    expect(popupState(), 'to be false');
                });
            });

            describe('handlers', function () {
                var beforeOpen, afterOpen, beforeClose, afterClose, popupState;
                beforeEach(function () {
                    beforeOpen = sinon.stub();
                    afterOpen = sinon.stub();
                    beforeClose = sinon.stub();
                    afterClose = sinon.stub();
                    popupState = ko.observable();
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate',
                            beforeOpen: beforeOpen,
                            afterOpen: afterOpen,
                            beforeClose: beforeClose,
                            afterClose: afterClose,
                            openState: popupState
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });

                it('calls the beforeOpen handler before opening', function (done) {
                    expect(beforeOpen, 'was not called');
                    var sub, subFunc = function () {
                        expect(beforeOpen, 'was called once');
                        sub.dispose();
                        done();
                    };
                    sub = popupState.subscribe(subFunc);
                    click('#test>div'); // Show popup
                });
                it('calls the afterOpen handler after opening', function () {
                    expect(afterOpen, 'was not called');
                    var sub, subfunc = function () {
                        expect(afterOpen, 'was not called');
                        sub.dispose();
                    };
                    sub = popupState.subscribe(subfunc);
                    click('#test>div'); // Show popup
                    expect(afterOpen, 'was called once');
                });
                it('calls the beforeClose handler before closing', function (done) {
                    expect(beforeClose, 'was not called');
                    click('#test>div');
                    popupState.subscribe(function () {
                        expect(beforeClose, 'was called once');
                        done();
                    });
                    click('body'); // Click outside
                });
                it('calls the afterClose handler after closing', function () {
                    expect(afterClose, 'was not called');
                    click('#test>div'); // Show popup
                    var sub, subfunc = function () {
                        expect(afterClose, 'was not called');
                        sub.dispose();
                    };
                    sub = popupState.subscribe(subfunc);
                    click('body'); // Click outside
                    expect(afterClose, 'was called once');
                });
            });
        });
    });
});
