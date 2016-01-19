(function() {

	var app = 'Raiblocks';
    var bootstrap = angular.module('bootstrap', []);
    var initInjector = angular.injector(['ng']);
    var $q = initInjector.get(['$q']);
    var $http = initInjector.get('$http');

	fetchLogo().then(function() {
		bootstrapApplication();
	});

    function fetchLogo() {

    	return $q(function(resolve, reject) {

    		$http.get('/images/logo.png').then(function(response) {

				angular.element(document).ready(function() {

					// pass loaded logo along to app.js
					bootstrap.constant('logo', response.data);					
                	
                	// deliver promise
					resolve();
				});
				
			});
    	});
    }

    function bootstrapApplication() {
        angular.element(document).ready(function() {
            angular.bootstrap(document, [app]);
        });
    }

}());