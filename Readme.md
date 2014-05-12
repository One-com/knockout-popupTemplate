# knockout.popupTemplate

This binding ties an element (called the anchor) to a template (called the popup), which will pop up on screen next to it. By default it works similarly to a dropdown menu, the popup being rendered on initialization, appearing below and aligned to the left edge of the anchor, shown when the anchor is clicked, and hidden if the user clicks outside the popup.

## Usage

The basic use of `popupTemplate` is thus:

```html
<div data-bind="popupTemplate: 'templateName'">Anchor text</div>
```

This will give the default behavior, outlined above. Alternatively, the binding can take a configuration object, with the following fields:

- `template`: *Required.* A string containing the name of the template to render.
- `data`: Data model to use rendering the template.
- `renderOnOpen`: If truthy, the popup is rendered when opened and disposed when closedrather than being merely shown or hidden.
- `openState`: An observable that is updated to follow the state of the popup. The popup can also be shown or hidden by setting the observable to true or false.
- `beforeOpen`: An event handler to be called before opening the popup.
- `afterOpen`: An event handler to be called immediately after opening the popup.
- `beforeClose`: An event handler to be called before closing the popup.
- `afterClose`: An event handler to be called immediately after closing the popup.
- `anchorHandler`: If false, clicking the anchor does not open or close the popup.
- `outsideHandler`: If false, clicking outside the popup will not close it.
- `positioning`: An object containing positioning information (see below).
- `className`: A string containing a class name to put in the class attribute of the popupTemplate container.

```html
<div data-bind="popupTemplate: { template: 'templateName' }">Anchor text</div>
```

## Positioning the popup

You can select where the popup will appear in relation to the anchor by passing an object in the `positioning` field of the configuration object, which should have one or both of `vertical` and `horizontal` fields.

These fields can contain either a string, or an observable containing a string. These strings should be selected from the following lists:

### Horizontal

- `'outside-left'`: Align the right edge of the popup with the left edge of the anchor.
- `'inside-left'`: Align the left edge of the popup with the left edge of the anchor.
- `'middle'`: Align the horizontal midpoint of the popup with the horizontal middle of the anchor.
- `'inside-right'`: Align the right edge of the popup with the right edge of the anchor.
- `'outside-right'`: Align the left edge of the popup with the right edge of the anchor.

### Vertical

- `'outside-top'`: Align the bottom edge of the popup with the top edge of the anchor.
- `'inside-top'`: Align the top edge of the popup with the top edge of the anchor.
- `'middle'`: Align the vertical midpoint of the popup with the vertical middle of the anchor.
- `'inside-bottom'`: Align the bottom edge of the popup with the bottom edge of the anchor.
- `'outside-bottom'`: Align the top edge of the popup with the bottom edge of the anchor.

## Examples

http://one-com.github.io/knockout-popupTemplate/examples/index.html

# License

Copyright &copy; 2014, One.com

knockout.popupTemplate is licensed under the BSD 3-clause license, as given at http://opensource.org/licenses/BSD-3-Clause
