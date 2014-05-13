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
            this.bindingContext.createChildContext(ko.utils.unwrapObservable(this.options.data)) :  // Given an explicit 'data' value, we create a child binding context for it
            this.bindingContext;                                               // Given no explicit 'data' value, we retain the same binding context
        ko.renderTemplate(this.options.template, innerBindingContext, { afterRender: done }, this.$popupHolder[0]);
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
        switch (this.options.positioning.horizontal()) {
        case 'outside-left':
            position.left -= this.$popupHolder.outerWidth();
            break;
        case 'inside-left':
            // No change in left coord.
            break;
        case 'middle':
            position.left += Math.round(this.$element.outerWidth() / 2);
            position.left -= Math.round(this.$popupHolder.width() / 2);
            break;
        case 'inside-right':
            position.left += this.$element.outerWidth();
            position.left -= this.$popupHolder.width();
            break;
        case 'outside-right':
            position.left += this.$element.outerWidth();
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
            position.top += Math.round(this.$element.outerHeight() / 2);
            position.top -= Math.round(this.$popupHolder.height() / 2);
            break;
        case 'inside-bottom':
            position.top += this.$element.outerHeight();
            position.top -= this.$popupHolder.height();
            break;
        case 'outside-bottom':
            position.top += this.$element.outerHeight();
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
        if (this.options.renderOnInit) {
            this.show(done);
        } else {
            this.render(function () {
                that.reposition();
                callMeMaybe(done);
            });
        }
    };

    Popup.prototype.close = function (done) {
        if (this.options.renderOnInit) {
            this.hide(done);
        } else {
            this.remove(done);
        }
    };

    ko.bindingHandlers.popupTemplate = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
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
                disposalCallBack: null,
                data: bindingContext.$data
            };

            var config = valueAccessor();
            if (typeof config === 'string') {
                config = {
                    template: config
                };
            }

            config = ko.utils.extend(defaultConfiguration, config);

            if (!ko.isObservable(config.openState)) {
                if (typeof config.openState === 'boolean') {
                    config.openState = ko.observable(config.openState);
                } else {
                    config.openState = ko.observable(false);
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

            if (config.outsideHandler) {
                config.afterOpen = callInSequence(addCloseHandler, config.afterOpen);
                config.beforeClose = callInSequence(config.beforeClose, removeCloseHandler);
            }

            var popup = new Popup(element, bindingContext, config);

            var $popupHolder = popup.$popupHolder;
            var $element = $(element);

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
