 (function() {

 	angular

	.module('Raiblocks', [ // primary module
		'bootstrap',
		'ngRoute', // angular routing
		'routeHelper', // route-assist
		'Chain', // block-chain processing
		'Explorer', // block-chain explorer
		'FreemiumAdsDemo', // freemium-ads demo
		'Distribution', // free-rai distribution
		'Start', // get started
		'Wallet', // wallet download
		'vcRecaptcha', // google recaptcha
		])

	.run(['BootstrapPayload', '$rootScope', '$templateCache', function(BootstrapPayload, $rootScope, $templateCache) {

		$rootScope.csrf = BootstrapPayload._csrf;
		$rootScope._csrf = { _csrf: BootstrapPayload._csrf };

    	$templateCache.removeAll();

		// initiate sidebar in background
		$('.ui.sidebar').sidebar();
		$('.ui.sidebar a').on('click', function() {
			$('.ui.sidebar').sidebar('hide');
		});
	}]);
})();