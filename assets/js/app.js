 (function() {

 	angular

	.module('Raiblocks', [ // primary module
		'bootstrap', // angular application boostrap
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
	
	.run(function($rootScope, $templateCache) {

    	$templateCache.removeAll();

		// initiate sidebar in background
		$('.ui.sidebar').sidebar();
		$('.ui.sidebar a').on('click', function() {
			$('.ui.sidebar').sidebar('hide');
		});

		// establish public app-wide variables
		$rootScope.recaptchaKey = '6LcPNAsTAAAAANCpxZY3SMikIjg5a0T9XTnjM-v4';
		$rootScope.faucetNumber = 'xrb_35jjmmmh81kydepzeuf9oec8hzkay7msr6yxagzxpcht7thwa5bus5tomgz9';
		$rootScope.rb_version = '7.4.7';
		$rootScope.total_faucet = 340282366000; // used for visual display of distribution # on get started
	})

	.config(function($routeProvider) {
		$routeProvider.when('/', {
			templateUrl : 'templates/home.html',
			controller  : 'homeCtrl'
		})
	})

	.controller('homeCtrl', ['$rootScope', '$scope', '$location', function($rootScope, $scope, $location) {

		// apply popups to social icons
		$('.social').popup({
			position: 'bottom center'
		});
	}])

})();