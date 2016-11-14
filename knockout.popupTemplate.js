/*
Copyright (c) 2014, One.com
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation and/or
other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
may be used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Source code found at https://github.com/One-com/knockout-popupTemplate
*/
(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory(require('jquery'), require('knockout'));
    } else if (typeof define === 'function' && define.amd) {
        define(['jquery', 'knockout'], factory);
    } else {
        /* global $, ko */
        factory($, ko);
    }
}(this, function ($, ko) {

    function callMeMaybe(callback) {
        if (typeof callback === 'function') { callback(); }
    }

    function callInSequence() {
        var args = Array.prototype.slice.call(arguments);
        return function () {
            args.filter(function (arg) {
                return typeof arg === 'function';
            }).forEach(function (arg) {
                arg.apply(null, arguments);
            });
        };
    }

    function Popup(element, bindingContext, options) {
        this.element = element;
        this.$element = $(element);
        this.options = options;
        this.bindingContext = bindingContext;

        this.subscriptions = [];

        this.bestPosition = ko.observable(null);
        this.$popupHolder = null;
        this.bestPosition.equalityComparer = function (a, b) {
            if (!a && b) { return false; }
            if (a && !b) { return false; }
            return a.vertical === b.vertical &&
                a.horizontal === b.horizontal;
        };

        this.subscriptions.push(this.options.openState.subscribe(this.observe.bind(this)));
        this.subscriptions.push(this.options.template.subscribe(function () {
            this.render();
        }, this));

        if (this.options.renderOnInit) {
            this.render();
            this.reposition();
            this.close();
        }

        // initial render if the popup is supposed to start open
        if (this.options.openState()) {
            this.observe(true);
        }

        ko.utils.domNodeDisposal.addDisposeCallback(this.element, function () {
            this.subscriptions.forEach(function (item) {
                item.dispose();
            });
        }.bind(this));
    }

    Popup.prototype.disabled = function () {
        var disabler = this.options.disable;
        if (ko.isObservable(disabler)) {
            return !!disabler();
        } else {
            return !!disabler;
        }
    };

    Popup.prototype.observe = function (newValue) {
        var that = this;
        if (newValue) {
            if (this.disabled()) {
                return;
            }
            // if the popup is being opened
            this.options.beforeOpen();
            this.open(function () {
                that.options.afterOpen();
            });
        } else {
            // if the popup is closed closed
            this.options.beforeClose();
            this.close(function () {
                that.options.afterClose();
            });
        }
    };

    Popup.prototype.isInsideViewport = function (anchorOffset, boundingRect, window, position) {
        var offset = this.calculateOffset(anchorOffset, position);
        return (
            window.pageXOffset <= offset.left &&
            window.pageYOffset <= offset.top &&
            offset.left + boundingRect.width <= window.innerWidth + window.pageXOffset &&
            offset.top + boundingRect.height <= window.innerHeight + window.pageYOffset
        );
    };

    Popup.prototype.getBestPosition = function () {
        var positioning = this.options.positioning;
        if (!this.$popupHolder || !this.options.openState()) {
            return ko.toJS(positioning[0]);
        }
        var anchorOffset = this.$element.offset();
        var boundingRect = this.$popupHolder[0].getBoundingClientRect();

        var bestCandidate = null;
        for (var i = 0; i < positioning.length; i += 1) {
            var position = ko.toJS(positioning[i]);
            var popupOffset = this.calculateOffset(anchorOffset, position);
            var constrainedOffset = this.keepInViewport(popupOffset, boundingRect, window);

            var distance = Math.sqrt(Math.pow(constrainedOffset.left - popupOffset.left, 2) +
                                     Math.pow(constrainedOffset.top - popupOffset.top, 2));

            if (distance === 0) {
                return position;
            }

            if (!bestCandidate || distance < bestCandidate.distance) {
                bestCandidate = {
                    position: position,
                    distance: distance
                };
            }

        }
        return bestCandidate.position;
    };

    Popup.prototype.createElementContainer = function () {
        var $popupHolder;
        var classes = ['popupTemplate', 'popup-container'];

        if (this.options.className) {
            classes.push(this.options.className);
        }

        this.bestPosition(this.getBestPosition());

        var position = ko.computed(function () {
            var position = this.bestPosition();
            return 'horizontal-' + position.horizontal +
                ' vertical-' + position.vertical;
        }, this);
        this.subscriptions.push(position);
        classes.push(position());

        $popupHolder = $('<div class="' + classes.join(' ') + '' + '"></div>');
        $popupHolder.css('position', 'absolute');

        this.subscriptions.push(position.subscribe(this.removePositionClasses, this, 'beforeChange'));
        this.subscriptions.push(position.subscribe(this.setPositionClasses, this));

        // Update when the positioning configuration changes
        var positioning = ko.computed(function () {
            return ko.toJS(this.options.positioning);
        }, this);
        this.subscriptions.push(positioning);
        this.subscriptions.push(positioning.subscribe(this.reposition, this));

        this.setPositionClasses();
        this.reposition();

        return $popupHolder;
    };


    Popup.prototype.removePositionClasses = function (positionClasses) {
        if (!this.$popupHolder) { return; }
        this.$popupHolder.removeClass(positionClasses);
    };

    Popup.prototype.setPositionClasses = function (positionClasses) {
        if (!this.$popupHolder) { return; }
        this.$popupHolder.toggleClass(positionClasses);
    };

    Popup.prototype.render = function (done) {
        if (!this.$popupHolder) {
            this.$popupHolder = this.createElementContainer();
        }

        this.$popupHolder.appendTo($('body'));

        ko.utils.domData.set(this.$popupHolder[0], 'anchor', this);
        var innerBindingContext = ('data' in this.options) ?
            this.bindingContext.createChildContext(this.options.data) :  // Given an explicit 'data' value, we create a child binding context for it
            this.bindingContext;                                               // Given no explicit 'data' value, we retain the same binding context
        ko.renderTemplate(this.options.template(), innerBindingContext, { afterRender: done }, this.$popupHolder[0]);
        ko.utils.domNodeDisposal.addDisposeCallback(this.element, this.remove.bind(this));
    };

    Popup.prototype.remove = function (done) {
        if (this.options.disposalCallback) {
            this.options.disposalCallback(this.$popupHolder[0]);
        } else {
            ko.removeNode(this.$popupHolder[0]);
        }
        callMeMaybe(done);
    };

    Popup.prototype.reposition = function (e) {
        if (!this.$popupHolder) { return; }

        var scrollTarget = e && e.type === 'scroll' && e.target;
        var isChildScrolling = scrollTarget && this.$popupHolder.has(scrollTarget).length > 0;
        if (isChildScrolling) {
            return;
        }

        this.bestPosition(this.getBestPosition());
        var boundingRect = this.$popupHolder[0].getBoundingClientRect();

        var offset = this.calculateInitialPosition();
        offset = this.keepInViewport(offset, boundingRect, window);
        this.$popupHolder.offset(offset);
    };

    Popup.prototype.calculateOffset = function (anchorOffset, position) {
        var offset = ko.utils.extend({}, anchorOffset);
        var horizontal = position.horizontal,
            vertical = position.vertical;

        var $anchor = this.$element;
        var $popupHolder = this.$popupHolder;

        if (horizontal === 'outside-left') {
            offset.left -= $popupHolder.outerWidth();
        } else if (horizontal === 'middle') {
            offset.left += Math.round($anchor.outerWidth() / 2);
            offset.left -= Math.round($popupHolder.width() / 2);
        } else if (horizontal === 'inside-right') {
            offset.left += $anchor.outerWidth();
            offset.left -= $popupHolder.width();
        } else if (horizontal === 'outside-right') {
            offset.left += $anchor.outerWidth();
        }
        // We do not do anything for the horizontal option inside-left:
        // We want it to have the same left coordinate as the anchor.

        if (vertical === 'outside-top') {
            offset.top -= $popupHolder.height();
        } else if (vertical === 'middle') {
            offset.top += Math.round($anchor.outerHeight() / 2);
            offset.top -= Math.round($popupHolder.height() / 2);
        } else if (vertical === 'inside-bottom') {
            offset.top += $anchor.outerHeight();
            offset.top -= $popupHolder.height();
        } else if (vertical === 'outside-bottom') {
            offset.top += $anchor.outerHeight();
        }
        // We do not do anything for the vertical option inside-top:
        // We want it to have the same top coordinate as the anchor.

        return offset;
    };

    Popup.prototype.calculateInitialPosition = function () {
        return this.calculateOffset(this.$element.offset(), this.bestPosition());
    };

    Popup.prototype.keepInViewport = function (offset, boundingRect, window) {
        var result = ko.utils.extend({}, offset);
        if (result.left + boundingRect.width > window.innerWidth + window.pageXOffset) {
            result.left = Math.max(window.innerWidth + window.pageXOffset - boundingRect.width, 0);
        }
        if (result.top + boundingRect.height > window.innerHeight + window.pageYOffset) {
            result.top = Math.max(window.innerHeight + window.pageYOffset - boundingRect.height, 0);
        }

        result.left = Math.max(window.pageXOffset, result.left);
        result.top = Math.max(window.pageYOffset, result.top);

        return result;
    };

    Popup.prototype.hide = function (done) {
        this.$popupHolder.css('visibility', 'hidden');
        callMeMaybe(done);
    };

    Popup.prototype.show = function (done) {
        this.$popupHolder.css('visibility', 'visible');
        this.reposition();
        callMeMaybe(done);
    };

    Popup.prototype.toggleClasses = function (bool) {
        this.$popupHolder.toggleClass('open', bool);
        this.$popupHolder.toggleClass('closed', !bool);
    };

    Popup.prototype.open = function (done) {
        var that = this;
        if (this.options.renderOnInit) {
            this.toggleClasses(true);
            this.show(done);
        } else {
            this.render(function () {
                that.reposition();
                that.toggleClasses(true);
                callMeMaybe(done);
                that.reposition();
            });
        }
    };

    Popup.prototype.close = function (done) {
        if (this.options.renderOnInit) {
            this.toggleClasses(false);
            this.hide(done);
        } else {
            this.toggleClasses(false);
            this.remove(done);
        }
    };

    function eachIFrameContents(callback) {
        $('iframe').each(function (index, iframe) {
            var src = iframe.src;
            var origin = window.location.origin || location.protocol + '//' + location.host;
            if (!src || src.indexOf(origin) === 0) {
                // try...catch to protect against foreign iframes throwing
                // "Failed to read the 'contentDocument' property from
                // 'HTMLIFrameElement': Blocked a frame with origin ...
                // from accessing a cross-origin frame."
                // Apparently that can happen despite the above check,
                // maybe because the iframe is missing a src attribute.
                var $contents;
                try {
                    $contents = $(iframe).contents();
                } catch (e) {}
                if ($contents) {
                    $contents.each(callback);
                }
            }
        });
    }

    Popup.closeOnEsc = {
        elements: [],
        handlerRegistered: false,
        handler: function (event) {
            if (Popup.closeOnEsc.elements.length > 0) {
                var lastIndex = Popup.closeOnEsc.elements.length - 1;
                var lastItem = Popup.closeOnEsc.elements[lastIndex];
                if (event.which === 27 && lastItem.openState()) {
                    lastItem.openState(false);
                }
            }
        },
        setupHandler: function () {
            if (!Popup.closeOnEsc.handlerRegistered) {
                document.addEventListener('keydown', Popup.closeOnEsc.handler, false);
                eachIFrameContents(function (index, doc) {
                    doc.addEventListener('keydown', Popup.closeOnEsc.handler, false);
                });
                Popup.closeOnEsc.handlerRegistered = true;
            }
        },
        tearDownHandler: function () {
            if (Popup.closeOnEsc.handlerRegistered && Popup.closeOnEsc.elements.length === 0) {
                document.removeEventListener('keydown', Popup.closeOnEsc.handler, false);
                eachIFrameContents(function (index, doc) {
                    doc.removeEventListener('keydown', Popup.closeOnEsc.handler, false);
                });
                Popup.closeOnEsc.handlerRegistered = false;
            }
        },
        registerElement: function (element) {
            Popup.closeOnEsc.elements.push(element);
            Popup.closeOnEsc.setupHandler();
        },
        unregisterElement: function (element) {
            Popup.closeOnEsc.elements = Popup.closeOnEsc.elements.filter(function (el) {
                return el !== element;
            });
            Popup.closeOnEsc.tearDownHandler();
        }
    };

    var HORIZONTAL_POSITIONS = ['outside-left', 'inside-left', 'middle', 'inside-right', 'outside-right'];
    var VERTICAL_POSITIONS = ['outside-top', 'inside-top', 'middle', 'inside-bottom', 'outside-bottom'];

    function stringToPositioning(positionString) {
        var positioningTokens = positionString.split(' ');
        var positioning = {};
        if (positioningTokens[0]) {
            positioning.horizontal = positioningTokens[0];
        }
        if (positioningTokens[1]) {
            positioning.vertical = positioningTokens[1];
        }
        return positioning;
    }

    function normalizePositioning(positioning) {
        if (typeof positioning === 'string') {
            positioning = stringToPositioning(positioning);
        }

        var vertical = ko.isObservable(positioning.vertical) ?
            positioning.vertical :
            ko.observable(positioning.vertical);
        var horizontal = ko.isObservable(positioning.horizontal) ?
            positioning.horizontal :
            ko.observable(positioning.horizontal);

        return {
            vertical: vertical,
            horizontal: horizontal
        };
    }

    function applyDefaults(positioning) {
        if (VERTICAL_POSITIONS.indexOf(positioning.vertical.peek()) === -1) {
            positioning.vertical('outside-bottom');
        }

        if (HORIZONTAL_POSITIONS.indexOf(positioning.horizontal.peek()) === -1) {
            positioning.horizontal('inside-left');
        }
    }

    function configFixupPositioning(config) {
        var positioning = config.positioning instanceof Array ?
            config.positioning : [config.positioning];

        positioning = positioning.map(normalizePositioning);
        positioning.forEach(applyDefaults);

        config.positioning = positioning;
        return config;
    }

    function configFixupOpenState(config) {
        if (!ko.isObservable(config.openState)) {
            if (typeof config.openState === 'boolean') {
                config.openState = ko.observable(config.openState);
            } else {
                config.openState = ko.observable(false);
            }
        }

        return config;
    }

    ko.bindingHandlers.popupTemplate = {
        _internals: {
            Popup: Popup,
            configFixupPositioning: configFixupPositioning,
            configFixupOpenState: configFixupOpenState
        },
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var config = valueAccessor();
            var defaultConfiguration = {
                renderOnInit: false,
                className: '',
                beforeOpen: function () {},
                afterOpen: function () {},
                beforeClose: function () {},
                afterClose: function () {},
                positioning: {},
                anchorHandler: true,
                outsideHandler: true,
                closeOnEsc: true,
                closeOnClickInPopup: false,
                openOnMouseOver: null,
                disposalCallBack: null,
                disable: null
            };

            if (typeof config === 'string') {
                config = {
                    template: ko.observable(config)
                };
            } else if (ko.isObservable(config) && typeof config() === 'string') {
                config = {
                    template: config
                };
            } else if (config.hasOwnProperty('template')) {
                if (!ko.isObservable(config.template)) {
                    config.template = ko.observable(config.template);
                }
            }

            config = ko.utils.extend(defaultConfiguration, config);
            config = configFixupPositioning(config);
            config = configFixupOpenState(config);

            var popup = new Popup(element, bindingContext, config);
            var popupReposition = popup.reposition.bind(popup);

            config.beforeOpen = config.beforeOpen.bind(popup);
            config.afterOpen = config.afterOpen.bind(popup);
            config.beforeClose = config.beforeClose.bind(popup);
            config.afterClose = config.afterClose.bind(popup);

            var $element = $(element);
            var insidePopupTemplate = false;

            if (config.outsideHandler || config.closeOnEsc) {
                config.afterOpen = callInSequence(addCloseHandler, config.afterOpen);
                config.beforeClose = callInSequence(config.beforeClose, removeCloseHandler);
            }

            if (config.anchorHandler) {
                if (defaultConfiguration.openOnMouseOver === true) {
                    var $popupTemplContainer;
                    $element.on('mouseover.popupTemplate', function (event) {
                        config.openState(true);
                        $popupTemplContainer = $(popup.$popupHolder[0]);

                        $popupTemplContainer.on('mouseover.popupTemplate', function (event) {
                            insidePopupTemplate = true;

                        });
                        $popupTemplContainer.on('mouseleave.popupTemplate', function (event) {
                            insidePopupTemplate = false;
                            config.openState(false);

                            removeEventsListener($popupTemplContainer, $element);
                        });

                        $element.on('mouseleave.popupTemplate', function (event) {
                            setTimeout(function () {
                                if (insidePopupTemplate === false) {
                                    config.openState(false);

                                    removeEventsListener($popupTemplContainer, $element);
                                }
                            }, 300);
                        });
                        event.stopPropagation();
                        event.preventDefault();
                    });
                } else {
                    $element.on('click.popupTemplate', function (event) {
                        if (event.which === 1) {
                            config.openState(!config.openState());
                            event.stopPropagation();
                            event.preventDefault();
                        }
                    });
                }
            }

            function removeEventsListener($container, $element) {
                $container.off('mouseleave.popupTemplate');
                $container.off('mouseenter.popupTemplate');
                $element.off('mouseleave.popupTemplate');
            }

            function closePopupHandler(event) {
                if (event.which === 1 && config.openState()) {
                    var target = event.target || document.elementFromPoint(event.pageX || event.clientX, event.pageY || event.clientY);

                    var $targetPopup = $(target).closest('.popup-container');

                    var inPopup = $targetPopup.length > 0;
                    if (inPopup) {
                        var targetPopup = ko.utils.domData.get($targetPopup[0], 'anchor');
                        var $targetPopupHolder = targetPopup.$popupHolder;
                        var $targetAnchor = targetPopup.$element;
                        var $popupHolder = popup.$popupHolder;
                        inPopup = $popupHolder.is($targetPopupHolder) || $popupHolder.has($targetAnchor).length > 0;
                    }

                    var isAnchor = $element.is(target) || $element.has(target).length > 0;
                    if (!isAnchor && !inPopup) {
                        config.openState(false);
                    }
                }
            }

            function closeOnClickInPopupHandler(event) {
                if (event.which === 1 && config.closeOnClickInPopup && config.openState()) {
                    var target = event.target || document.elementFromPoint(event.pageX || event.clientX, event.pageY || event.clientY);
                    var $popupHolder = popup.$popupHolder;
                    var isPopup = $popupHolder.is(target) || $popupHolder.has(target).length > 0;
                    if (isPopup) {
                        config.openState(false);
                    }
                }
            }

            function addCloseHandler() {
                eachIFrameContents(function (index, doc) {
                    if (config.outsideHandler) {
                        doc.addEventListener('click', closePopupHandler, true);
                        doc.addEventListener('click', closeOnClickInPopupHandler, true);
                    }
                });
                if (config.outsideHandler) {
                    document.addEventListener('click', closePopupHandler, true);
                    document.addEventListener('click', closeOnClickInPopupHandler, true);
                }
                if (config.closeOnEsc) {
                    Popup.closeOnEsc.registerElement(config);
                }
                $(window).on('resize', popupReposition);
                window.addEventListener('scroll', popupReposition, true);
            }

            function removeCloseHandler() {
                eachIFrameContents(function (index, doc) {
                    if (config.outsideHandler) {
                        doc.removeEventListener('click', closePopupHandler, true);
                        doc.removeEventListener('click', closeOnClickInPopupHandler, true);
                    }
                });
                if (config.outsideHandler) {
                    document.removeEventListener('click', closePopupHandler, true);
                    document.removeEventListener('click', closeOnClickInPopupHandler, true);
                }
                if (config.closeOnEsc) {
                    Popup.closeOnEsc.unregisterElement(config);
                }
                $(window).off('resize', popupReposition);
                window.removeEventListener('scroll', popupReposition, true);
            }


            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                removeCloseHandler();
            });
        }
    };

    return ko.bindingHandlers.popupTemplate;

}));
