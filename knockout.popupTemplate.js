define([
    'jquery',
    'knockout'
], function ($, ko) {
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
            config.openState = ko.isObservable(config.openState) ? config.openState : ko.observable();
            config.openState(false);
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
                ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                    removePopup();
                });
            }

            function removePopup() {
                $popupHolder.remove();
            }


            function repositionPopup() {
                var position = $element.offset();
                position.top += $element.height();
                $popupHolder.offset(position);
            }

            function closePopupHandler(event) {
                if (event.which === 1 && !$element.is(event.target) && !$element.has(event.target).length &&
                    !$popupHolder.is(event.target) && !$popupHolder.has(event.target).length) {
                    togglePopup();
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
                repositionPopup();
                opener = showPopup;
                closer = hidePopup;
                closer();
            }

            $element.on('mousedown.popupTemplate', function (event) {
                if (event.which === 1) {
                    togglePopup();
                }
            });

            function togglePopup() {
                if (config.openState()) {
                    // if the popup is open
                    config.beforeClose();
                    closer();
                    removeCloseHandler();
                    config.openState(false);
                    config.afterClose();
                } else {
                    // if the popup is closed
                    config.beforeOpen();
                    opener();
                    addCloseHandler();
                    config.openState(true);
                    config.afterOpen();
                }
            }
        }
    };
});
