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

        this.$popupHolder = this.createElementContainer();

        this.subscriptions.push(this.options.openState.subscribe(this.observe.bind(this)));
        this.subscriptions.push(this.options.template.subscribe(function () {
            this.render();
        }.bind(this)));

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
            if (this.disabled()) return;
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

    Popup.prototype.createElementContainer = function () {
        var $popupHolder;
        var popupClassName = 'popupTemplate';
        if (this.options.className) {
            popupClassName += ' ' + this.options.className;
        }
        $popupHolder = $('<div class="' + popupClassName + '"></div>');
        $popupHolder.css('position', 'absolute');

        this.subscriptions.push(this.options.positioning.horizontal.subscribe(this.reposition.bind(this)));
        this.subscriptions.push(this.options.positioning.vertical.subscribe(this.reposition.bind(this)));

        return $popupHolder;
    };

    Popup.prototype.render = function (done) {
        this.$popupHolder.appendTo($('body'));
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

    Popup.prototype.reposition = function () {
        if (!this.$popupHolder) { return; }
        var position = this.$element.offset();
        var boundingRect = this.$popupHolder[0].getBoundingClientRect();
        position = this.calculateInitialPosition(position);
        position = this.keepInViewport(position, boundingRect, window);
        this.$popupHolder.offset(position);
    };

    Popup.prototype.calculateInitialPosition = function (position) {
        var horizontal = this.options.positioning.horizontal(),
            vertical = this.options.positioning.vertical();

        if (horizontal === 'outside-left') {
            position.left -= this.$popupHolder.outerWidth();
        } else if (horizontal === 'middle') {
            position.left += Math.round(this.$element.outerWidth() / 2);
            position.left -= Math.round(this.$popupHolder.width() / 2);
        } else if (horizontal === 'inside-right') {
            position.left += this.$element.outerWidth();
            position.left -= this.$popupHolder.width();
        } else if (horizontal === 'outside-right') {
            position.left += this.$element.outerWidth();
        }
        // We do not do anything for the horizontal option inside-left:
        // We want it to have the same left coordinate as the anchor.

        if (vertical === 'outside-top') {
            position.top -= this.$popupHolder.height();
        } else if (vertical === 'middle') {
            position.top += Math.round(this.$element.outerHeight() / 2);
            position.top -= Math.round(this.$popupHolder.height() / 2);
        } else if (vertical === 'inside-bottom') {
            position.top += this.$element.outerHeight();
            position.top -= this.$popupHolder.height();
        } else if (vertical === 'outside-bottom') {
            position.top += this.$element.outerHeight();
        }
        // We do not do anything for the vertical option inside-top:
        // We want it to have the same top coordinate as the anchor.

        return position;
    };

    Popup.prototype.keepInViewport = function (position, boundingRect, window) {
        if (position.left + boundingRect.width > window.innerWidth + window.pageXOffset) {
            position.left = Math.max(window.innerWidth + window.pageXOffset - boundingRect.width, 0);
        }
        if (position.top + boundingRect.height > window.innerHeight + window.pageYOffset) {
            position.top = Math.max(window.innerHeight + window.pageYOffset - boundingRect.height, 0);
        }

        position.left = Math.max(window.pageXOffset, position.left);
        position.top = Math.max(window.pageYOffset, position.top);

        return position;
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

    var HORIZONTAL_POSITIONS = ['outside-left', 'inside-left', 'middle', 'inside-right', 'outside-right'];
    var VERTICAL_POSITIONS = ['outside-top', 'inside-top', 'middle', 'inside-bottom', 'outside-bottom'];

    function configFixupPositioning(config) {
        if (typeof config.positioning === 'string') {
            var positioningTokens = config.positioning.split(' ');
            config.positioning = {};
            if (positioningTokens[0]) {
                config.positioning.horizontal = positioningTokens[0];
            }
            if (positioningTokens[1]) {
                config.positioning.vertical = positioningTokens[1];
            }
        }

        if (HORIZONTAL_POSITIONS.indexOf(config.positioning.horizontal) !== -1) {
            config.positioning.horizontal = ko.observable(config.positioning.horizontal);
        } else if (ko.isObservable(config.positioning.horizontal) && HORIZONTAL_POSITIONS.indexOf(config.positioning.horizontal()) !== -1) {
        } else if (ko.isObservable(config.positioning.horizontal)) {
            config.positioning.horizontal('inside-left');
        } else {
            config.positioning.horizontal = ko.observable('inside-left');
        }
        if (VERTICAL_POSITIONS.indexOf(config.positioning.vertical) !== -1) {
            config.positioning.vertical = ko.observable(config.positioning.vertical);
        } else if (ko.isObservable(config.positioning.vertical) && VERTICAL_POSITIONS.indexOf(config.positioning.vertical()) !== -1) {
        } else if (ko.isObservable(config.positioning.vertical)) {
            config.positioning.vertical('outside-bottom');
        } else {
            config.positioning.vertical = ko.observable('outside-bottom');
        }

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

            var $popupHolder = popup.$popupHolder;
            var $element = $(element);

            if (config.outsideHandler || config.closeOnEsc) {
                config.afterOpen = callInSequence(addCloseHandler, config.afterOpen);
                config.beforeClose = callInSequence(config.beforeClose, removeCloseHandler);
            }

            if (config.anchorHandler) {
                $element.on('mousedown.popupTemplate', function (event) {
                    if (event.which === 1) {
                        config.openState(!config.openState());
                        event.stopPropagation();
                        event.preventDefault();
                    }
                });
            }

            function closePopupHandler(event) {
                if (event.which === 1 && config.openState()) {
                    var target = event.target || document.elementFromPoint(event.pageX || event.clientX, event.pageY || event.clientY);
                    var isPopup = $popupHolder.is(target) || $popupHolder.has(target).length > 0;
                    var isAnchor = $element.is(target) || $element.has(target).length > 0;
                    if (!isAnchor && !isPopup) {
                        config.openState(false);
                    }
                }
            }

            function closeOnClickInPopupHandler(event) {
                if (event.which === 1 && config.openState()) {
                    var target = event.target || document.elementFromPoint(event.pageX || event.clientX, event.pageY || event.clientY);
                    var isPopup = $popupHolder.is(target) || $popupHolder.has(target).length > 0;
                    if (isPopup && config.closeOnClickInPopup) {
                        config.openState(false);
                    }
                }
            }

            function closePopupHandlerOnEsc(event) {
                if (event.which === 27 && config.openState()) {
                    config.openState(false);
                }
            }

            function eachIFrameContents(callback) {
                $('iframe').each(function (index, iframe) {
                    var src = iframe.src;
                    var origin = window.location.origin || location.protocol + '//' + location.host;
                    if (!src || src.indexOf(origin) === 0) {
                        $(iframe).contents().each(callback);
                    }
                });
            }

            function addCloseHandler() {
                eachIFrameContents(function (index, doc) {
                    if (config.outsideHandler) {
                        doc.addEventListener('mousedown', closePopupHandler, true);
                        doc.addEventListener('click', closeOnClickInPopupHandler, true);
                    }
                    if (config.closeOnEsc) {
                        doc.addEventListener('keyup', closePopupHandlerOnEsc, true);
                    }
                });
                if (config.outsideHandler) {
                    document.addEventListener('mousedown', closePopupHandler, true);
                    document.addEventListener('click', closeOnClickInPopupHandler, true);
                }
                if (config.closeOnEsc) {
                    document.addEventListener('keyup', closePopupHandlerOnEsc, true);
                }
                window.addEventListener('resize', popupReposition, false);
            }

            function removeCloseHandler() {
                eachIFrameContents(function (index, doc) {
                    if (config.outsideHandler) {
                        doc.removeEventListener('mousedown', closePopupHandler, true);
                        doc.removeEventListener('click', closeOnClickInPopupHandler, true);
                    }
                    if (config.closeOnEsc) {
                        doc.removeEventListener('keyup', closePopupHandlerOnEsc, true);
                    }
                });
                if (config.outsideHandler) {
                    document.removeEventListener('mousedown', closePopupHandler, true);
                    document.removeEventListener('click', closeOnClickInPopupHandler, true);
                }
                if (config.closeOnEsc) {
                    document.removeEventListener('keyup', closePopupHandlerOnEsc, true);
                }
                window.removeEventListener('resize', popupReposition, false);
            }


            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                removeCloseHandler();
            });
        }
    };

    return ko.bindingHandlers.popupTemplate;

}));
