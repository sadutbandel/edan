(function() {

    /**
     * This file gets stuff done before we actually start loading all of our AngularJS modules
     */
	var app = 'Raiblocks';
    var bootstrap = angular.module('bootstrap', []);
    var initInjector = angular.injector(['ng']);
    var $q = initInjector.get(['$q']);
    var $http = initInjector.get('$http');

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