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
        root.BeforeUnload = factory($, ko);
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
            config.data = config.data || bindingContext.$data;
            config.beforeOpen = config.beforeOpen || function () {};
            config.afterOpen = config.afterOpen || function () {};
            config.beforeClose = config.beforeClose || function () {};
            config.afterClose = config.afterClose || function () {};
            config.openState = ko.isObservable(config.openState) ? config.openState : ko.observable(false);
            config.positioning = config.positioning || {};
            config.clickHandler = config.clickHandler === false ? false : true;
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

            function renderPopup() {
                $popupHolder = $('<div class="popupTemplate"></div>');
                $popupHolder.appendTo($('body'));
                $popupHolder.css('position', 'absolute');
                var innerBindingContext = ('data' in config) ?
                    bindingContext.createChildContext(ko.utils.unwrapObservable(config.data, config.as)) :  // Given an explicit 'data' value, we create a child binding context for it
                    bindingContext;                                               // Given no explicit 'data' value, we retain the same binding context
                ko.renderTemplate(config.template, innerBindingContext, [], $popupHolder[0]);
                ko.utils.domNodeDisposal.addDisposeCallback(element, removePopup);
            }

            function removePopup() {
                removeCloseHandler();
                $popupHolder.remove();
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
                if (event.which === 1 && !$element.is(event.target) && !$element.has(event.target).length &&
                    !$popupHolder.is(event.target) && !$popupHolder.has(event.target).length) {
                    config.openState(false);
                }
            }
            function addCloseHandler() {
                $('iframe').contents().on('mousedown.popupTemplate', closePopupHandler);
                $(document).on('mousedown.popupTemplate', closePopupHandler);
            }
            function removeCloseHandler() {
                $('iframe').contents().off('mousedown.popupTemplate', closePopupHandler);
                $(document).off('mousedown.popupTemplate', closePopupHandler);
            }

            function hidePopup() {
                $popupHolder.css('visibility', 'hidden');
            }

            function showPopup() {
                $popupHolder.css('visibility', 'visible');
                repositionPopup();
            }

            var opener, closer;
            if (config.renderOnOpen) {
                opener = function () {
                    renderPopup();
                    repositionPopup();
                };
                closer = removePopup;
            } else {
                renderPopup();
                opener = showPopup;
                closer = hidePopup;
                closer();
            }

            if (config.clickHandler) {
                $element.on('mousedown.popupTemplate', function (event) {
                    if (event.which === 1) {
                        config.openState(!config.openState());
                    }
                });
            }

            subscriptions.push(config.openState.subscribe(function (newValue) {
                if (newValue) {
                    // if the popup is being opened
                    config.beforeOpen();
                    opener();
                    addCloseHandler();
                    config.afterOpen();
                } else {
                    // if the popup is closed closed
                    config.beforeClose();
                    closer();
                    removeCloseHandler();
                    config.afterClose();
                }
            }));

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                subscriptions.forEach(function (item) {
                    item.dispose();
                });
            });
        }
    };

    return ko.bindingHandlers.popupTemplate;

}));
