/*global expect, ko, $, sinon, describe, it, before, after, beforeEach, afterEach*/

expect.addAssertion('[not] to be visible', function (expect, subject) {
    expect(subject, 'to be rendered');
    var state = this.flags.not ? 'hidden' : 'visible';
    expect($(subject).css('visibility'), 'to be', state);
});

expect.addAssertion('[not] to have class', function (expect, subject, className) {
    expect(subject, 'to be rendered');
    expect($(subject).hasClass(className), '[not] to be true');
});

expect.addAssertion('to have classes', function (expect, subject) {
    var classes = Array.prototype.slice.call(arguments, 2);
    expect(classes, 'to be non-empty');
    classes.forEach(function (className) {
        expect(subject, 'to have class', className);
    });
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

    function createMouseEvent(options) {
        var event = document.createEvent('MouseEvent');
        var which = 'which' in options ? options.which : 0;
        var bubble = 'bubble' in options ? options.bubble : true;
        var cancelable = 'cancelable' in options ? options.cancelable : true;
        event.initMouseEvent(
            // See https://developer.mozilla.org/en-US/docs/Web/API/event.initMouseEvent
            options.type, // type
            bubble, // can bubble
            cancelable, // can cancelable
            window, null, 0, 0, 0, 0, false, false, false, false,
            which, // Button: 0 = Left click, 1 = Middle click, 2 = Right click
            null
        );
        // Below doesn't work in PhantomJS
        // var event = new MouseEvent('mousedown', { which: 1 });
        return event;
    }

    function dispatchMouseEvent(selector, eventOptions) {
        $(selector)[0].dispatchEvent(createMouseEvent(eventOptions));
    }

    function mouseDown(selector) {
        dispatchMouseEvent(selector, { type: 'mousedown' });
    }

    function click(selector) {
        dispatchMouseEvent(selector, { type: 'click' });
    }

    describe('defaults', function () {
        beforeEach(function () {
            $('<div id="anchor1" data-bind="popupTemplate: \'popupTemplate\'">Popup1</div>').appendTo($testElement);
            $('<div id="anchor2" data-bind="popupTemplate: \'popupTemplate3\'">Popup2</div>').appendTo($testElement);
            var bindingContext = {};
            ko.applyBindings(bindingContext, $testElement[0]);
        });

        it('does not render a template in the body tag initially', function () {
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it('shows the popup when element is clicked', function () {
            mouseDown('#anchor1');
            expect('body>.popupTemplate>#template', 'to be rendered');
            expect('body>.popupTemplate>#template', 'to be visible');
        });

        it('removes the popup again on click outside popup', function () {
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            expect('body>.popupTemplate>#template', 'to be visible');
            mouseDown('body'); // Click outside
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });
        it('removes the popup again on anchor click', function () {
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            expect('body>.popupTemplate>#template', 'to be visible');
            mouseDown('#anchor1'); // Click inside
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it('works even with many open/closes @slow', function () {
            for (var i = 0; i < 20; i += 1) {
                mouseDown('#anchor1'); // Show popup
                expect('body>.popupTemplate>#template', 'to be rendered');
                expect('body>.popupTemplate>#template', 'to be visible');
                mouseDown('body'); // Click outside
                expect('body>.popupTemplate>#template', 'not to be rendered');
            }
        });

        it('does not hide on click within the popup', function () {
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            mouseDown('body>.popupTemplate>#template'); // Click inside popup
            expect('body>.popupTemplate>#template', 'to be rendered');
        });

        it('closes when a click hits another popup anchor', function () {
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            mouseDown('#anchor2'); // Show popup
            expect('body>.popupTemplate>#template', 'not to be rendered');
            expect('body>.popupTemplate>#template3', 'to be rendered');
        });

        it('closes when a click hits a button that stops propagation', function () {
            $('<button id="someButton">A button</button>').appendTo($testElement);
            $('#someButton').on('mousedown', function (e) {
                e.stopPropagation();
            });
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            mouseDown('#someButton'); // Show popup
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it('closes when clicked inside an iframe', function () {
            var $iframe = $('<iframe>');
            $testElement.append($iframe);
            var $iframeBody = $iframe.contents().find('body');
            $iframeBody.append('<div id="clicktarget">');
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            mouseDown($iframeBody.find('#clicktarget')); // Click in iframe
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it("... even when it's the second iframe", function () {
            var $iframe = $('<iframe>');
            $testElement.append($iframe);
            $iframe = $('<iframe>');
            $testElement.append($iframe);
            var $iframeBody = $iframe.contents().find('body');
            $iframeBody.append('<div id="clicktarget">');
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            mouseDown($iframeBody.find('#clicktarget')); // Click in iframe
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it.skip('closes when escape is hit', function () {
            mouseDown('#anchor1'); // Show popup
            expect('body>.popupTemplate>#template', 'to be rendered');
            // TODO: Getting the triggerKey method to work proved to
            //       be harder than expected this method must work in
            //       browsers and phantomjs. Skipping the test for
            //       now. Verified this to work manually.
            // triggerKey('keyup', 'esc');
            expect('body>.popupTemplate>#template', 'not to be rendered');
        });

        it('works even with many open/closes @slow', function () {
            var $iframe = $('<iframe>');
            $testElement.append($iframe);
            var $iframeBody = $iframe.contents().find('body');
            $iframeBody.append('<div id="clicktarget">');
            for (var i = 0; i < 20; i += 1) {
                mouseDown('#anchor1'); // Show popup
                expect('body>.popupTemplate>#template', 'to be rendered');
                mouseDown($iframeBody.find('#clicktarget')); // Click in iframe
                expect('body>.popupTemplate>#template', 'not to be rendered');
            }
        });

        it('positions the popup just below the element, aligning left borders', function () {
            var $anchor = $('#anchor1');
            mouseDown('#anchor1');
            var popupPosition = $('body>.popupTemplate').offset();
            var elementPosition = $anchor.offset();
            expect(popupPosition.left, 'to be', elementPosition.left);
            expect(popupPosition.top, 'to be', elementPosition.top + $anchor.height());
        });
    });
    describe('configurations', function () {
        describe('config objects and data models', function () {
            beforeEach(function () {
                $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: {
                        template: 'popupTemplate2',
                        renderOnInit: true,
                        data: {
                            testText: 'This is a test'
                        }
                    }
                };
                ko.applyBindings(bindingContext, $testElement[0]);
            });

            it('can accept a configuration object', function () {
                expect('body>.popupTemplate>#template', 'to be rendered');
            });

            it('renders the template with the given data model', function () {
                expect($('body>.popupTemplate>#template').html(), 'to be', 'This is a test');
            });
        });

        describe('observable template', function () {
            it('should be able to render a template passed as an observable', function () {
                $('<div id="anchor" data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: {
                        template: ko.observable('popupTemplate')
                    }
                };
                ko.applyBindings(bindingContext, $testElement[0]);
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be rendered');
            });
            it('should be able to render a template passed as an observable directly', function () {
                $('<div id="anchor" data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: ko.observable('popupTemplate')
                };
                ko.applyBindings(bindingContext, $testElement[0]);
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be rendered');
            });
            it('should be able to rerender when the template observable changes.', function () {
                $('<div id="anchor" data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: {
                        template: ko.observable('popupTemplate'),
                        data: {
                            testText: 'the template changed!'
                        }
                    }
                };
                ko.applyBindings(bindingContext, $testElement[0]);
                mouseDown('#anchor');
                expect($('body>.popupTemplate>#template').html(), 'to be', 'popup');
                bindingContext.config.template('popupTemplate2');
                expect($('body>.popupTemplate>#template').html(), 'to be', 'the template changed!');
            });
        });

        describe('start open', function () {
            describe('renderOnOpen', function () {
                beforeEach(function () {
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate',
                            openState: ko.observable(true)
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });
                it('should be visible if openState is true', function () {
                    expect('body>.popupTemplate>#template', 'to be rendered');
                    expect('body>.popupTemplate>#template', 'to be visible');
                });
            });
            describe('renderOnInit', function () {
                beforeEach(function () {
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var bindingContext = {
                        config: {
                            template: 'popupTemplate',
                            renderOnInit: true,
                            openState: ko.observable(true)
                        }
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);
                });

                it('should be visible if openState is true', function () {
                    expect('body>.popupTemplate>#template', 'to be rendered');
                    expect('body>.popupTemplate>#template', 'to be visible');
                });
            });
        });

        describe('renderOnInit', function () {
            beforeEach(function () {
                $('<div id="anchor" data-bind="popupTemplate: { template: \'popupTemplate\', renderOnInit: true } ">Popup1</div>').appendTo($testElement);
                var bindingContext = {};
                ko.applyBindings(bindingContext, $testElement[0]);
            });

            it('render a template in the body tag initially', function () {
                expect('body>.popupTemplate>#template', 'to be rendered');
            });

            it('hides the popup element at first', function () {
                expect('body>.popupTemplate>#template', 'to be rendered');
                expect('body>.popupTemplate>#template', 'not to be visible');
            });

            it('shows the popup when element is clicked', function () {
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be visible');
            });

            it('hides the popup again on click outside popup', function () {
                mouseDown('#anchor'); // Show popup
                mouseDown('body'); // Click outside
                expect('body>.popupTemplate>#template', 'to be rendered');
                expect('body>.popupTemplate>#template', 'not to be visible');
            });
        });

        describe('closeOnClickInPopup', function () {
            beforeEach(function () {
                $('<div id="anchor" data-bind="popupTemplate: { template: \'popupTemplate\', closeOnClickInPopup: true } ">Popup1</div>').appendTo($testElement);
                var bindingContext = {};
                ko.applyBindings(bindingContext, $testElement[0]);
            });

            it('shows the popup when element is clicked', function () {
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be rendered');
            });

            it('hides the popup again on click outside popup', function () {
                mouseDown('#anchor'); // Show popup
                mouseDown('body'); // Click outside
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });

            it('hides the popup again on click inside popup', function () {
                mouseDown('#anchor'); // Show popup
                click('body>.popupTemplate>#template'); // Click in popup
                expect('body>.popupTemplate>#template', 'not to be rendered');
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

            it('sets the state observable to true when opening the popup', function () {
                mouseDown('#test>div'); // Show popup
                expect(popupState(), 'to be true');
            });

            it('resets the state observable to false when closing the popup', function () {
                mouseDown('#test>div'); // Show popup
                mouseDown('body'); // Click outside
                expect(popupState(), 'to be false');
            });
            it('closes the popup if config.openState is set to false', function () {
                mouseDown('#test>div'); // Show popup
                expect('body>.popupTemplate>#template', 'to be rendered');
                popupState(false);
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });
            it('opens the popup if config.openState is set to true', function () {
                expect('body>.popupTemplate>#template', 'not to be rendered');
                popupState(true);
                expect('body>.popupTemplate>#template', 'to be rendered');
            });
        });

        describe('state observable (made from nonobservable input value)', function () {
            var config;
            var applyBindings = function () {
                ko.applyBindings({ config: config }, $testElement[0]);
            };
            beforeEach(function () {
                $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                config = {
                    template: 'popupTemplate'
                };
            });
            it('render when passed a boolean true value', function () {
                config.openState = true;
                applyBindings();
                expect('body>.popupTemplate>#template', 'to be rendered');
            });
            it('do not render when passed a boolean false value', function () {
                config.openState = false;
                applyBindings();
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });
            it('do not render when passed a non-boolean and a non-observable value', function () {
                config.openState = 'a really stupid value for a (observable) boolean flag';
                applyBindings();
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });
        });

        describe('disable switch', function () {
            var config;
            var applyBindings = function () {
                ko.applyBindings({ config: config }, $testElement[0]);
            };
            beforeEach(function () {
                $('<div id="anchor" data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                config = {
                    template: 'popupTemplate'
                };
            });

            it('shows the popup when element is clicked when \'disable\' is false', function () {
                config.disable = false;
                applyBindings();
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be rendered');
                expect('body>.popupTemplate>#template', 'to be visible');
            });

            it('does not show the popup when element is clicked when \'disable\' is true', function () {
                config.disable = true;
                applyBindings();
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });

            it('shows the popup when element is clicked when \'disable\' is a falsy observable', function () {
                config.disable = ko.observable(false);
                applyBindings();
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'to be rendered');
                expect('body>.popupTemplate>#template', 'to be visible');
            });

            it('does not show the popup when element is clicked when \'disable\' is a truthy observable', function () {
                config.disable = ko.observable(true);
                applyBindings();
                mouseDown('#anchor');
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });
        });

        describe('handlers', function () {
            var beforeOpen, afterOpen, beforeClose, afterClose, popupState;
            beforeEach(function () {
                beforeOpen = sinon.spy();
                afterOpen = sinon.spy();
                beforeClose = sinon.spy();
                afterClose = sinon.spy();
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

            it('it calls the beforeOpen and afterOpen hooks in the right order', function () {
                mouseDown('#test>div'); // Show popup
                expect([beforeOpen, afterOpen], 'given call order');
                expect(beforeOpen, 'was called once');
                expect(afterOpen, 'was called once');
            });

            it('it calls the beforeClose and afterClose hooks in the right order', function () {
                mouseDown('#test>div'); // Show popup
                mouseDown('#test>div'); // Close popup
                expect([beforeClose, afterClose], 'given call order');
                expect(beforeClose, 'was called once');
                expect(afterClose, 'was called once');
            });
        });

        describe('make the anchor click handler optional', function () {
            var openState;
            beforeEach(function () {
                openState = ko.observable(false);
                $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: {
                        template: 'popupTemplate',
                        openState: openState,
                        anchorHandler: false
                    }
                };
                ko.applyBindings(bindingContext, $testElement[0]);
            });
            it('should not open on click', function () {
                mouseDown('#test>div');
                expect(openState(), 'to be false');
                expect('body>.popupTemplate>#template', 'not to be rendered');
            });
        });

        describe('make the outside click handler optional', function () {
            var openState;
            beforeEach(function () {
                openState = ko.observable(false);
                $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                var bindingContext = {
                    config: {
                        template: 'popupTemplate',
                        openState: openState,
                        outsideHandler: false
                    }
                };
                ko.applyBindings(bindingContext, $testElement[0]);
            });
            it('should not close on body click.', function () {
                mouseDown('#test>div'); // Show popup
                mouseDown('body'); // Close popup
                expect(openState(), 'to be true');
                expect('body>.popupTemplate>#template', 'to be visible');
            });
        });

        describe('positioning', function () {
            describe('configuration', function () {
                var config;
                var configFixupPositioning = ko.bindingHandlers.popupTemplate._internals.configFixupPositioning;
                it('accepts string positioning', function () {
                    config = configFixupPositioning({
                        positioning: {
                            horizontal: 'outside-right',
                            vertical: 'middle'
                        }
                    });

                    expect(config.positioning.horizontal, 'to equal', ko.observable('outside-right'));
                    expect(config.positioning.vertical, 'to equal', ko.observable('middle'));
                });

                it('accepts empty or invalid observable positioning', function () {
                    config = configFixupPositioning({
                        positioning: {
                            horizontal: ko.observable(),
                            vertical: ko.observable('invalid')
                        }
                    });

                    expect(config.positioning.horizontal, 'to equal', ko.observable('inside-left'));
                    expect(config.positioning.vertical, 'to equal', ko.observable('outside-bottom'));
                });

                it('accepts valid observable positioning', function () {
                    config = configFixupPositioning({
                        positioning: {
                            horizontal: ko.observable('middle'),
                            vertical: ko.observable('outside-top')
                        }
                    });

                    expect(config.positioning.horizontal, 'to equal', ko.observable('middle'));
                    expect(config.positioning.vertical, 'to equal', ko.observable('outside-top'));
                });

                it('take a string for configuration instead of an object', function () {
                    config = configFixupPositioning({
                        positioning: 'outside-right middle'
                    });

                    expect(config.positioning.horizontal, 'to equal', ko.observable('outside-right'));
                    expect(config.positioning.vertical, 'to equal', ko.observable('middle'));
                });

                it('allow passing only horizontal value when passing string', function () {
                    config = configFixupPositioning({
                        positioning: 'outside-right'
                    });

                    expect(config.positioning.horizontal, 'to equal', ko.observable('outside-right'));
                    expect(config.positioning.vertical, 'to equal', ko.observable('outside-bottom'));
                });

                it('annotate the popup container with the positions', function () {
                    $('<div data-bind="popupTemplate: config">Popup</div>').appendTo($testElement);
                    var config = {
                        template: 'popupTemplate',
                        renderOnInit: true,
                        openState: ko.observable(true),
                        positioning: {
                            horizontal: ko.observable('inside-left'),
                            vertical: ko.observable()
                        }
                    };
                    var bindingContext = {
                        config: config
                    };
                    ko.applyBindings(bindingContext, $testElement[0]);

                    expect('body>.popupTemplate', 'to have classes',
                           'horizontal-inside-left',
                           'vertical-outside-bottom');

                    ['outside-left', 'inside-left', 'middle', 'inside-right', 'outside-right'].forEach(function (horizontalPosition) {
                        ['outside-top', 'inside-top', 'middle', 'inside-bottom', 'outside-bottom'].forEach(function (verticalPosition) {
                            config.positioning.horizontal(horizontalPosition);
                            config.positioning.vertical(verticalPosition);

                            expect('body>.popupTemplate', 'to have classes',
                                   'horizontal-' + horizontalPosition,
                                   'vertical-' + verticalPosition);
                        });
                    });
                });

            });

            describe('calculation', function () {
                var config;
                var popup;
                var anchorPosition = { left: 200, top: 200 };
                var popupFactory = function (options) {
                    options = { positioning: options };
                    options = ko.bindingHandlers.popupTemplate._internals.configFixupPositioning(options);
                    options.openState = ko.observable(false);
                    options.template = ko.observable('bogus');
                    var element = '';
                    var bindingContext = {};
                    return new ko.bindingHandlers.popupTemplate._internals.Popup(element, bindingContext, options);
                };
                var positionFactory = function (left, top) {
                    return {
                        left: left,
                        top: top
                    };
                };

                beforeEach(function () {
                    popup = null;
                });

                it('horizontal alignment outside-left', function () {
                    popup = popupFactory({ horizontal: 'outside-left' });

                    popup.$popupHolder.outerWidth = sinon.stub().returns(100);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(100, 200));
                });

                it('horizontal alignment inside-left', function () {
                    popup = popupFactory({ horizontal: 'inside-left' });

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 200));
                });

                it('horizontal alignment middle', function () {
                    popup = popupFactory({ horizontal: 'middle' });

                    popup.$element.outerWidth = sinon.stub().returns(20);
                    popup.$popupHolder.width = sinon.stub().returns(100);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(160, 200));
                });

                it('horizontal alignment inside-right', function () {
                    popup = popupFactory({ horizontal: 'inside-right' });

                    popup.$element.outerWidth = sinon.stub().returns(10);
                    popup.$popupHolder.width = sinon.stub().returns(100);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(110, 200));
                });

                it('horizontal alignment outside-right', function () {
                    popup = popupFactory({ horizontal: 'outside-right' });

                    popup.$element.outerWidth = sinon.stub().returns(10);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(210, 200));
                });

                it('vertical alignment outside-top', function () {
                    popup = popupFactory({ vertical: 'outside-top' });

                    popup.$popupHolder.height = sinon.stub().returns(100);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 100));
                });

                it('vertical alignment inside-top', function () {
                    popup = popupFactory({ vertical: 'inside-top' });

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 200));
                });

                it('vertical alignment middle', function () {
                    popup = popupFactory({ vertical: 'middle' });

                    popup.$popupHolder.height = sinon.stub().returns(100);
                    popup.$element.outerHeight = sinon.stub().returns(20);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 160));
                });

                it('vertical alignment inside-bottom', function () {
                    popup = popupFactory({ vertical: 'inside-bottom' });

                    popup.$popupHolder.height = sinon.stub().returns(100);
                    popup.$element.outerHeight = sinon.stub().returns(20);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 120));
                });
                it('vertical alignment outside-bottom', function () {
                    popup = popupFactory({vertical: 'outside-bottom' });

                    popup.$element.outerHeight = sinon.stub().returns(20);

                    expect(popup.calculateInitialPosition(positionFactory(200, 200)), 'to equal', positionFactory(200, 220));
                });
            });

            describe('keepInViewport', function () {
                var initTemplatePos;
                var templateRect;
                var windowObj;
                var Popup = ko.bindingHandlers.popupTemplate._internals.Popup;
                var keepInViewport = function () {
                    return Popup.prototype.keepInViewport(initTemplatePos, templateRect, windowObj);
                };

                expect.addAssertion('to be positioned at', function (expect, subject, left, top) {
                    expect(subject, 'to have property', 'left', left);
                    expect(subject, 'to have property', 'top', top);
                });

                beforeEach(function () {
                    initTemplatePos = {
                        left: 200,
                        top: 200
                    };
                    templateRect = {
                        width: 200,
                        height: 200
                    };
                    windowObj = {
                        innerWidth: 600,
                        innerHeight: 400,
                        pageXOffset: 0,
                        pageYOffset: 0
                    };
                });

                it('should not change the position if the popup can fit within bounds', function () {
                    expect(keepInViewport(), 'to be positioned at', 200, 200);
                });

                it('should not go out of the right side of the screen', function () {
                    initTemplatePos.left = 500;
                    expect(keepInViewport(), 'to be positioned at', 400, 200);
                });

                it('should not go out of over the bottom of the screen', function () {
                    initTemplatePos.top = 250;
                    expect(keepInViewport(), 'to be positioned at', 200, 200);
                });

                it('should never go out of the left side of the screen', function () {
                    initTemplatePos.left = -100;
                    expect(keepInViewport(), 'to be positioned at', 0, 200);
                });

                it('should never go out of the top of the screen', function () {
                    initTemplatePos.top = -100;
                    expect(keepInViewport(), 'to be positioned at', 200, 0);
                });
            });

            describe('repositioning', function () {
                var config;
                var Popup = ko.bindingHandlers.popupTemplate._internals.Popup;
                var origKeepInViewport;

                before(function () {
                    origKeepInViewport = Popup.prototype.keepInViewport;
                    Popup.prototype.keepInViewport = sinon.stub().returnsArg(0);
                });

                after(function () {
                    Popup.prototype.keepInViewport = origKeepInViewport;
                });

                beforeEach(function () {
                    $('<div id="anchor" data-bind="popupTemplate: config" style="margin-left: 300px; width: 200px; height: 50px; padding: 5px; border: 1px solid black;">Popup</div>').appendTo($testElement);
                });

                it('while open', function () {
                    config = {
                        template: 'popupTemplate',
                        positioning: {
                            horizontal: ko.observable('inside-left'),
                            vertical: ko.observable('outside-bottom')
                        }
                    };
                    ko.applyBindings({ config: config }, $testElement[0]);
                    var $anchor = $('#anchor');
                    mouseDown('#anchor');
                    var $popup = $('body>.popupTemplate');
                    expect($popup.offset().left, 'to be', $anchor.offset().left);
                    expect($popup.offset().top, 'to be', $anchor.offset().top + $anchor.outerHeight());
                    config.positioning.horizontal('outside-left');
                    expect($popup.offset().left, 'to be', $anchor.offset().left - $popup.outerWidth());
                    config.positioning.vertical('inside-bottom');
                    expect($popup.offset().top + $popup.height(), 'to be', $anchor.offset().top + $anchor.outerHeight());
                });
            });
        });
        describe('className', function () {
            var config;
            var applyBindings = function () {
                ko.applyBindings({ config: config }, $testElement[0]);
            };
            beforeEach(function () {
                config = {
                    template: 'popupTemplate',
                    openState: ko.observable(false)
                };
                $('<div id="anchor" data-bind="popupTemplate: config" style="margin-left: 300px; width: 200px; height: 50px; padding: 5px; border: 1px solid black;">Popup</div>').appendTo($testElement);
            });

            it('gives the popup a class name if asked to', function () {
                config.className = 'aTestClassName';
                applyBindings();
                config.openState(true);
                var $popup = $('body>.popupTemplate');
                expect($popup, 'to have class', 'aTestClassName');
            });
        });
        describe('Disposal callback', function () {
            var config, element;
            var applyBindings = function () {
                ko.applyBindings({ config: config }, $testElement[0]);
            };

            beforeEach(function () {
                config = {
                    template: 'popupTemplate',
                    openState: ko.observable(false)
                };
                $('<div id="anchor" data-bind="popupTemplate: config" style="margin-left: 300px; width: 200px; height: 50px; padding: 5px; border: 1px solid black;">Popup</div>').appendTo($testElement);
                element = $('#anchor', $testElement)[0];
            });

            afterEach(function () {
                ko.cleanNode($testElement[0]);
                $testElement.empty();
            });

            it('Calls the disposal callback if given, when knockout tears out the element.', function () {
                config.disposalCallback = sinon.spy();
                applyBindings();
                config.openState(true); // open popup
                ko.removeNode(element); // tear anchor out
                expect(config.disposalCallback, 'was called with', $('body>.popupTemplate')[0]);
                $('body>.popupTemplate').remove(); // Clean up the template
            });

            it('Calls the disposal callback if given, when popup is closed.', function () {
                config.disposalCallback = sinon.spy();
                applyBindings();
                config.openState(true); // open popup
                config.openState(false); // close popup
                expect(config.disposalCallback, 'was called with', $('body>.popupTemplate')[0]);
                $('body>.popupTemplate').remove(); // Clean up the template
            });

            it('does not remove the popupTemplate automaticly', function () {
                config.disposalCallback = sinon.stub();
                applyBindings();
                config.openState(true);
                ko.removeNode(element);
                expect('body>.popupTemplate', 'to be rendered');
                $('body>.popupTemplate').remove(); // Clean up the template
            });

            describe('with faked timers', function () {
                var clock;

                beforeEach(function () {
                    clock = sinon.useFakeTimers();
                });

                afterEach(function () {
                    clock.restore();
                });

                it('animation test case', function () {
                    config.disposalCallback = sinon.spy(function (popup) {
                        setTimeout(function () {
                            $(popup).remove();
                        }, 100);
                    });
                    applyBindings();
                    config.openState(true);
                    expect('body>.popupTemplate', 'to be rendered');
                    config.openState(false);
                    expect(config.disposalCallback, 'was called');
                    expect('body>.popupTemplate', 'to be rendered');
                    clock.tick(101);
                    expect('body>.popupTemplate', 'not to be rendered');
                });
            });
        });
        describe('open/closed classes', function () {
            var config, element;
            var applyBindings = function () {
                ko.applyBindings({ config: config }, $testElement[0]);
            };

            beforeEach(function () {
                config = {
                    template: 'popupTemplate',
                    openState: ko.observable(false)
                };
                $('<div id="anchor" data-bind="popupTemplate: config" style="margin-left: 300px; width: 200px; height: 50px; padding: 5px; border: 1px solid black;">Popup</div>').appendTo($testElement);
                element = $('#anchor', $testElement)[0];
            });

            afterEach(function () {
                ko.cleanNode($testElement[0]);
                $testElement.empty();
            });

            it('should have class open if its open', function () {
                applyBindings();
                config.openState(true);
                expect('body>.popupTemplate', 'to have class', 'open');
            });

            it('should have class open if its open from the start', function () {
                config.openState(true);
                applyBindings();
                expect('body>.popupTemplate', 'to have class', 'open');
            });

            it('should have class closed if its not yet removed', function () {
                config.disposalCallback = function () {}; // dont remove the element when it's closed
                applyBindings();
                config.openState(true);
                expect('body>.popupTemplate', 'to have class', 'open');
                config.openState(false);
                expect('body>.popupTemplate', 'not to have class', 'open');
                expect('body>.popupTemplate', 'to have class', 'closed');
                $('body>.popupTemplate').remove(); // manual cleanup
            });

            describe('renderOnInit', function () {

                beforeEach(function () {
                    config = {
                        template: 'popupTemplate',
                        openState: ko.observable(false),
                        renderOnInit: true
                    };
                    $('<div id="anchor" data-bind="popupTemplate: config" style="margin-left: 300px; width: 200px; height: 50px; padding: 5px; border: 1px solid black;">Popup</div>').appendTo($testElement);
                    element = $('#anchor', $testElement)[0];
                });

                afterEach(function () {
                    ko.cleanNode($testElement[0]);
                    $testElement.empty();
                });

                it('should have class closed if its not yet opened', function () {
                    applyBindings();
                    expect('body>.popupTemplate', 'to have class', 'closed');
                    expect('body>.popupTemplate', 'not to have class', 'open');
                });
                it('should have class open when it is opened', function () {
                    applyBindings();
                    config.openState(true);
                    expect('body>.popupTemplate', 'to have class', 'open');
                    expect('body>.popupTemplate', 'not to have class', 'closed');
                });
                it('should have class open when it is opened from the start', function () {
                    config.openState(true);
                    applyBindings();
                    expect('body>.popupTemplate', 'to have class', 'open');
                    expect('body>.popupTemplate', 'not to have class', 'closed');
                });
                it('should have class closed when it is opened and then closed', function () {
                    applyBindings();
                    config.openState(true);
                    config.openState(false);
                    expect('body>.popupTemplate', 'to have class', 'closed');
                    expect('body>.popupTemplate', 'not to have class', 'open');
                });
            });
        });
    });
});
