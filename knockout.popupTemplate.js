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

    var HORIZONTAL_POSITIONS = ['outside-left', 'inside-left', 'middle', 'inside-right', 'outside-right'];
    var VERTICAL_POSITIONS = ['outside-top', 'inside-top', 'middle', 'inside-bottom', 'outside-bottom'];

    function callMeMaybe(callback) {
        if (typeof callback === 'function') { callback(); }
    }

    function beforeCallingCall(origFn, fn) {
        return function () {
            callMeMaybe(origFn);
            callMeMaybe(fn);
        };
    }

    function Anchor(options) {
        this.element = options.element;
        this.$element = $(this.element);

        this.openState = options.openState;
    }

    Anchor.prototype.setupHandler = function () {
        var that = this;
        this.$element.on('mousedown.popupTemplate', function (event) {
            if (event.which === 1) {
                that.openState(!that.openState());
                event.stopPropagation();
                event.preventDefault();
            }
        });
    };

    function Popup(anchor, options) {
        this.anchor = anchor;
        this.options = options;

        this.subscriptions = [];

        this.$popupHolder = this.createElementContainer();

        this.subscriptions.push(this.options.openState.subscribe(this.observe.bind(this)));

        if (this.options.renderOnInit) {
            this.render();
            this.reposition();
            this.close();
        }

        // initial render if the popup is supposed to start open
        if (this.options.openState()) {
            this.observe(true);
        }

        ko.utils.domNodeDisposal.addDisposeCallback(this.anchor.element, function () {
            this.subscriptions.forEach(function (item) {
                item.dispose();
            });
        }.bind(this));
    }

    Popup.prototype.observe = function (newValue) {
        var that = this;
        if (newValue) {
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
            this.options.bindingContext.createChildContext(ko.utils.unwrapObservable(this.options.data)) :  // Given an explicit 'data' value, we create a child binding context for it
            this.options.bindingContext;                                               // Given no explicit 'data' value, we retain the same binding context
        ko.renderTemplate(this.options.template, innerBindingContext, { afterRender: done }, this.$popupHolder[0]);
        ko.utils.domNodeDisposal.addDisposeCallback(this.anchor.element, this.remove.bind(this));
    };

    Popup.prototype.remove = function (done) {
        if (this.options.disposalCallback) {
            this.options.disposalCallback(this.$popupHolder[0]);
        } else {
            this.$popupHolder.remove();
        }
        callMeMaybe(done);
    };

    Popup.prototype.reposition = function () {
        if (!this.$popupHolder) { return; }
        var position = this.anchor.$element.offset();
        switch (this.options.positioning.horizontal()) {
        case 'outside-left':
            position.left -= this.$popupHolder.outerWidth();
            break;
        case 'inside-left':
            // No change in left coord.
            break;
        case 'middle':
            position.left += Math.round(this.anchor.$element.outerWidth() / 2);
            position.left -= Math.round(this.$popupHolder.width() / 2);
            break;
        case 'inside-right':
            position.left += this.anchor.$element.outerWidth();
            position.left -= this.$popupHolder.width();
            break;
        case 'outside-right':
            position.left += this.anchor.$element.outerWidth();
            break;
        }
        switch (this.options.positioning.vertical()) {
        case 'outside-top':
            position.top -= this.$popupHolder.height();
            break;
        case 'inside-top':
            // No change in top coord
            break;
        case 'middle':
            position.top += Math.round(this.anchor.$element.outerHeight() / 2);
            position.top -= Math.round(this.$popupHolder.height() / 2);
            break;
        case 'inside-bottom':
            position.top += this.anchor.$element.outerHeight();
            position.top -= this.$popupHolder.height();
            break;
        case 'outside-bottom':
            position.top += this.anchor.$element.outerHeight();
            break;
        }
        this.$popupHolder.offset(position);
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

    Popup.prototype.open = function (done) {
        var that = this;
        if (this.options.renderOnOpen) {
            this.render(function () {
                that.reposition();
                callMeMaybe(done);
            });
        } else {
            this.show(done);
        }
    };

    Popup.prototype.close = function (done) {
        if (this.options.renderOnOpen) {
            this.remove(done);
        } else {
            this.hide(done);
        }
    };

    ko.bindingHandlers.popupTemplate = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var config = valueAccessor();
            if (typeof config === 'string') {
                config = {
                    template: config
                };
            }

            if (!ko.isObservable(config.openState)) {
                if (typeof config.openState === 'boolean') {
                    config.openState = ko.observable(config.openState);
                } else {
                    config.openState = ko.observable(false);
                }
            }

            config.renderOnInit = !!config.renderOnInit;
            config.renderOnOpen = !config.renderOnInit;
            config.className = config.className || '';
            config.data = config.data || bindingContext.$data;
            config.beforeOpen = config.beforeOpen || function () {};
            config.afterOpen = config.afterOpen || function () {};
            config.beforeClose = config.beforeClose || function () {};
            config.afterClose = config.afterClose || function () {};
            config.positioning = config.positioning || {};
            config.anchorHandler = config.anchorHandler === false ? false : true;
            config.outsideHandler = config.outsideHandler === false ? false : true;
            config.disposalCallback = config.disposalCallback || null;
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

            var $element = $(element);

            // REFACTORED STUFF START
            if (config.outsideHandler) {
                config.afterOpen = beforeCallingCall(config.afterOpen, addCloseHandler);
                config.beforeClose = beforeCallingCall(config.beforeClose, removeCloseHandler);
            }

            var anchor = new Anchor({
                element: element,
                openState: config.openState
            });

            if (config.anchorHandler) {
                anchor.setupHandler();
            }

            var popup = new Popup(anchor, {
                className: config.className,
                data: config.data,
                bindingContext: bindingContext,
                template: config.template,
                disposalCallback: config.disposalCallback,
                openState: config.openState,
                positioning: config.positioning,
                beforeOpen: config.beforeOpen,
                renderOnOpen: config.renderOnOpen,
                renderOnInit: config.renderOnInit,
                afterOpen: config.afterOpen,
                beforeClose: config.beforeClose,
                afterClose: config.afterClose
            });
            // REFACTORED STUFF END

            var $popupHolder = popup.$popupHolder;

            function closePopupHandler(event) {
                if (event.which === 1 && config.openState()) {
                    var target = event.target || document.elementFromPoint(event.pageX || event.clientX, event.pageY || event.clientY);
                    var isPopup = $popupHolder.is(target) || $popupHolder.has(target).length > 0;
                    var isAnchor = $element.is(target) || $element.has(target).length > 0;
                    if (!isPopup && !isAnchor) {
                        config.openState(false);
                    }
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
                    doc.addEventListener('mousedown', closePopupHandler, true);
                });
                document.addEventListener('mousedown', closePopupHandler, true);
            }

            function removeCloseHandler() {
                eachIFrameContents(function (index, doc) {
                    doc.removeEventListener('mousedown', closePopupHandler, true);
                });
                document.removeEventListener('mousedown', closePopupHandler, true);
            }

        }
    };

    return ko.bindingHandlers.popupTemplate;

}));
