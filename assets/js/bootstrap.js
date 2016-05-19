(function() {

    /**
     * This file gets stuff done before we actually start loading all of our AngularJS modules
     */
	var app = 'Raiblocks';
    var bootstrap = angular.module('bootstrap', []);

    // create a dependency injector for doing stuff here before the application loads
    var initInjector = angular.injector(['ng']);

    // we're going to change how we interpolate below
    var $interpolate = initInjector.get('$interpolate');

    // instead of {{}} for interpolation, we'll use [[]] because handlebars.js uses {{}}
    bootstrap.config(['$interpolate', function($interpolate) {
        $interpolate.startSymbol('[[');
        $interpolate.endSymbol(']]');
    }])

	bootstrapApplication();

    function bootstrapApplication() {

        // our bootstrap payload
        var payload = {};

        // fetch csrf token for app-usage
        io.socket.get('/csrfToken', function (resData, jwres){

            // pass the csrf to angular stack
            payload._csrf = resData._csrf;

            angular.element(document).ready(function() {

                // passes the payload to app.js
                angular.module(app).value('BootstrapPayload', payload);

                // giddyup!
                angular.bootstrap(document, [app]);
            });
        });        
    }

}());