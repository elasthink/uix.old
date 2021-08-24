/**
 * Rutas de la aplicación.
 * @type {{path: string, view: string, handler: function}[]}
 */
app.routes = [
    {
        path: '/',
        view: 'about'
    }, {
        path: '/widgets',
        routes: [
            {
                path: '/button',
                view: 'widgets/button'
            },
            {
                path: '/select',
                view: 'widgets/select'
            },
            {
                path: '/text',
                view: 'widgets/text'
            },
            {
                path: '/check',
                view: 'widgets/check'
            },
            {
                path: '/form',
                view: 'widgets/form'
            },
            {
                path: '/dialog',
                view: 'widgets/dialog'
            },
            {
                path: '/dropdown',
                view: 'widgets/dropdown'
            },
            {
                path: '/toast',
                view: 'widgets/toast'
            }
        ]
    }, {
        path: '/add-ons',
        routes: [
            {
                path: '/views',
                view: 'add-ons/views'
            }
        ]
    }
];