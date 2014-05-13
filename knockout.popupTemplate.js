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

            var subscriptions = [];
            var $element = $(element);
            var $popupHolder;

            function renderPopup(done) {
                var popupClassName = 'popupTemplate';
                if (config.className) {
                    popupClassName += ' ' + config.className;
                }
                $popupHolder = $('<div class="' + popupClassName + '"></div>');
                $popupHolder.appendTo($('body'));
                $popupHolder.css('position', 'absolute');
                var innerBindingContext = ('data' in config) ?
                    bindingContext.createChildContext(ko.utils.unwrapObservable(config.data, config.as)) :  // Given an explicit 'data' value, we create a child binding context for it
                    bindingContext;                                               // Given no explicit 'data' value, we retain the same binding context
                ko.renderTemplate(config.template, innerBindingContext, { afterRender: done }, $popupHolder[0]);
                ko.utils.domNodeDisposal.addDisposeCallback(element, removePopup);
            }

            function removePopup(done) {
                if (config.disposalCallback) {
                    config.disposalCallback($popupHolder[0]);
                } else {
                    $popupHolder.remove();
                }
                if (typeof done === 'function') { done(); }
            }


            function repositionPopup() {
                var position = $element.offset();
                switch (config.positioning.horizontal()) {
                case 'outside-left':
                    position.left -= $popupHolder.outerWidth();
                    break;
                case 'inside-left':
                    // No change in left coord.
                    break;
                case 'middle':
                    position.left += Math.round($element.outerWidth() / 2);
                    position.left -= Math.round($popupHolder.width() / 2);
                    break;
                case 'inside-right':
                    position.left += $element.outerWidth();
                    position.left -= $popupHolder.width();
                    break;
                case 'outside-right':
                    position.left += $element.outerWidth();
                    break;
                }
                switch (config.positioning.vertical()) {
                case 'outside-top':
                    position.top -= $popupHolder.height();
                    break;
                case 'inside-top':
                    // No change in top coord
                    break;
                case 'middle':
                    position.top += Math.round($element.outerHeight() / 2);
                    position.top -= Math.round($popupHolder.height() / 2);
                    break;
                case 'inside-bottom':
                    position.top += $element.outerHeight();
                    position.top -= $popupHolder.height();
                    break;
                case 'outside-bottom':
                    position.top += $element.outerHeight();
                    break;
                }
                $popupHolder.offset(position);
            }

            subscriptions.push(config.positioning.horizontal.subscribe(repositionPopup));
            subscriptions.push(config.positioning.vertical.subscribe(repositionPopup));

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

            function hidePopup(done) {
                $popupHolder.css('visibility', 'hidden');
                if (typeof done === 'function') { done(); }
            }

            function showPopup(done) {
                $popupHolder.css('visibility', 'visible');
                repositionPopup();
                done();
            }

            var opener, closer;
            if (config.renderOnOpen) {
                opener = function (done) {
                    renderPopup(function () {
                        repositionPopup();
                        done();
                    });
                };
                closer = removePopup;
            } else {
                renderPopup();
                opener = showPopup;
                closer = hidePopup;
                closer();
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

            function render(newValue) {
                if (newValue) {
                    // if the popup is being opened
                    config.beforeOpen();
                    opener(function () {
                        if (config.outsideHandler) addCloseHandler();
                        config.afterOpen();
                    });
                } else {
                    // if the popup is closed closed
                    config.beforeClose();
                    if (config.outsideHandler) removeCloseHandler();
                    closer(function () {
                        config.afterClose();
                    });
                }
            }

            subscriptions.push(config.openState.subscribe(render));

            // initial render if the popup is supposed to start open
            if (config.openState()) {
                render(true);
            }

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                subscriptions.forEach(function (item) {
                    item.dispose();
                });
            });
        }
    };

    return ko.bindingHandlers.popupTemplate;

}));
