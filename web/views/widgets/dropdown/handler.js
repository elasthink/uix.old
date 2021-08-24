/**
 * Página de referencia del componente "uix-dropdown".
 * @class DropdownWidgetView
 * @extends View
 */
View.define('widgets/dropdown', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        var open = function(event) {
            var parentEl = uix.closest(event.target, '.uix-dropdown-container');
            uix.toggleDropdown(parentEl.querySelector('.uix-dropdown'));
        };
        root.querySelector('#dropdown1 .uix-dropdown-toggle').addEventListener('tap', open);
        root.querySelector('#dropdown2 .uix-dropdown-toggle').addEventListener('tap', open);
    }

});