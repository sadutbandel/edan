 (function() {

 	angular

	.module('Raiblocks', [ // primary module
		'ngRoute', // angular routing
		'routeHelper', // route-assist
		'Chain', // block-chain processing
		'Explorer', // block-chain explorer
		'Demos', // use-case demos
		'Distribution', // free-rai distribution
		'Start', // get started
		'Wallet', // wallet download
		'vcRecaptcha', // google recaptcha
		])
		
	// instead of {{}} for interpolation, we'll use [[]] because handlebars.js uses {{}}
	.config(function($interpolateProvider) {
		$interpolateProvider.startSymbol('[[');
		$interpolateProvider.endSymbol(']]');
	})

	.run(['$rootScope', '$templateCache', function($rootScope, $templateCache) {

		// fetch csrf token for app-usage
		io.socket.get('/csrfToken', function (resData, jwres){
			$rootScope.csrf = resData._csrf;
			$rootScope._csrf = { _csrf: $rootScope.csrf };
		});

    	$templateCache.removeAll();

		// initiate sidebar in background
		$('.ui.sidebar').sidebar();
		$('.ui.sidebar a').on('click', function() {
			$('.ui.sidebar').sidebar('hide');
		});

	}]);
})();