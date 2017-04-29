/**
 * Página de referencia del componente "uix-form".
 * @class FormWidgetView
 * @extends View
 */
View.define('widgets/form', {

    /**
     * @see View.prototype.ready
     */
    ready: function(root) {
        var form = root.querySelector('.my-form');
        var submit = root.querySelector('.uix-submit');
        // Email
        uix.forms.rule(form, '[name="email"]', function(input, data) {
            input.value = input.value.trim();
            if (input.value === '') {
                uix.forms.error(input, 'Please enter your email address.');
                return false;
            }
            if (data) {
                data.email = input.value;
            }
        });
        // Username
        uix.forms.rule(form, '[name="username"]', function(input, data) {
            input.value = input.value.trim();
            if (input.value === '') {
                uix.forms.error(input, 'Please enter an username.');
                return false;
            }
            if (data) {
                data.username = input.value;
            }
        });
        // Password
        uix.forms.rule(form, '[name="password"]', function(input, data) {
            input.value = input.value.trim();
            if (input.value === '') {
                uix.forms.error(input, 'Please enter a password.');
                return false;
            }
            if (data) {
                data.password = input.value;
            }
        });
        // Submit
        form.addEventListener('submit', function(event) {
            var data = {};
            // error();
            if (uix.forms.validate(form, data)) {
                submit.disabled = true;
                setTimeout(function() {
                    submit.disabled = false;
                    uix.forms.error(form, 'We\'re sorry, an error occurred.<br/>Please try again later.');
                }, 500);
            }
            event.preventDefault();
        });
    }

});