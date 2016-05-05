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
	
	.run(['$rootScope', '$templateCache', function($rootScope, $templateCache) {

		// fetch csrf token
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

		// establish public app-wide variables
		$rootScope.recaptchaKey = '6LcPNAsTAAAAANCpxZY3SMikIjg5a0T9XTnjM-v4';
		$rootScope.faucetNumber = 'xrb_35jjmmmh81kydepzeuf9oec8hzkay7msr6yxagzxpcht7thwa5bus5tomgz9';
		$rootScope.total_faucet = 340282366000; // used for visual display of distribution # on get started
	}]);
})();