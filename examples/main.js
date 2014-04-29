/*global ko, $*/
$(function () {
    var horizontal = ko.observable();
    var vertical = ko.observable();
    var viewModel = {
        positionConfig: {
            template: 'position-template',
            data: {
                horizontal: horizontal,
                vertical: vertical
            },
            positioning: {
                horizontal: horizontal,
                vertical: vertical
            }
        }
    };
    ko.applyBindings(viewModel, document.getElementById('application'));
});
