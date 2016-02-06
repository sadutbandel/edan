 (function() {

	angular

	.module('Raiblocks', [ // primary module
		'bootstrap', // angular application boostrap
		'routeHelper', // route-assist
		'vcRecaptcha', // google recaptcha
		'ngRoute', // routing
		'ngAnimate', // require for ui.bootstrap
		'ui.bootstrap', // angularized-bootstrap
		'RBDemos', // demos
		])

	// route provider (defines our front-end routes)
	.config(function($routeProvider) {

		$routeProvider

		.when('/', {
			templateUrl : 'templates/home.html',
			controller  : 'homeCtrl'
		})
		.when('/start', {
			templateUrl : 'templates/start.html',
			controller  : 'startCtrl'
		})
		.when('/block', {
			templateUrl : 'templates/block.html',
			controller  : 'blockCtrl'
		})
		.when('/getblocks', {
			templateUrl : 'templates/getblocks.html',
			controller  : 'getBlocksCtrl'
		});

	})

	.run(function($rootScope, logo) {

		// grab logo from bootstrap
		$rootScope.logo = logo;

		// establish public app-wide variables
		$rootScope.recaptchaKey = '6LcPNAsTAAAAANCpxZY3SMikIjg5a0T9XTnjM-v4';
		$rootScope.faucetNumber = 'xrb_35jjmmmh81kydepzeuf9oec8hzkay7msr6yxagzxpcht7thwa5bus5tomgz9';
		$rootScope.rb_version = '7.2.1';
	})

	.directive('freeRaiForm', function() {

        return {

            restrict: 'E',
            templateUrl: 'templates/free-rai-form.html',
            controller: function($scope, $http, $timeout, vcRecaptchaService) {

				$scope.init = function () {
					$scope.account = null;
					$scope.response = null;
					$scope.widgetId = null;
				}

				$scope.init();
				
		  		$scope.setResponse = function (response) {
					$scope.response = response;
				};

				$scope.setWidgetId = function (widgetId) {
		     		$scope.widgetId = widgetId;
		  		};

		  		// define the different button states
		  		button = {

		  			default: {
		  				disabled: false,
		  				icon: 'fa-plus-circle',
		  				title: 'Request 1000 Mrai',
		  				class: 'btn-primary'
		  			},

		  			claiming: {
		  				disabled: true,
		  				icon: 'fa-spin fa-spinner',
		  				title: 'Sending free Mrai',
		  				class: 'btn-default'
		  			},

		  			claimed: {
		  				disabled: true,
		  				icon: 'fa-thumbs-up',
		  				title: 'Free Mrai Sent',
		  				class: 'btn-success'
		  			},

		  			account_error: {
		  				disabled: true,
		  				icon: 'fa-thumbs-down',
		  				title: 'Provide a valid account id',
		  				class: 'btn-danger'
		  			},

		  			recaptcha_error: {
		  				disabled: true,
		  				icon: 'fa-thumbs-down',
		  				title: 'Complete the reCaptcha',
		  				class: 'btn-danger'
		  			},

		  			not_free: {
		  				disabled: true,
		  				icon: 'fa-thumbs-down',
		  				title: 'RaiBlocks are not free right now',
		  				class: 'btn-danger'
		  			}
		  		};

		  		$scope.button = button.default;

				$scope.validateAccount = function() {
					if($scope.account === null || $scope.account === '') {
						$scope.button = button.account_error;
						return false;
					} else {
						return true;
					}
				}

				$scope.validateResponse = function() {
					if($scope.response === null || $scope.response === '') {
						$scope.button = button.recaptcha_error;
						return false;
					} else {
						return true;
					}
				}

				$scope.validateForm = function() {
					if($scope.validateAccount()) {
						if($scope.validateResponse()) {
							return true;
						} else {
							return false;
						}
					} else {
						return false;
					}
				}

				// submit form, triggers validateForm(), which triggers validateAccount() and validateResponse()
				$scope.submit = function () {

					if($scope.validateForm()) {

						$scope.button = button.claiming;

						payload = {
							account: $scope.account,
							response: $scope.response
						};
						
						$http.post('/freerai', payload)

						.success(function(data) {

							$timeout(function() {

								$scope.button = button[data.message];

								$timeout(function() {
									vcRecaptchaService.reload($scope.widgetId);
									$scope.init();
									$scope.button = button.default;
								}, 3000);

							}, 3000);
						})
						.error(function(data, status) {
							console.error('Error', status, data);
						});

					} else {
						$timeout(function() {
							$scope.button = button.default;
						}, 3000);
					}
				}		
            }
        };
    })

	// allow entry to the block chain page
	.controller('homeCtrl', function($rootScope, $scope, $location) {

		$scope.pass = 0;
	    $scope.process = function() {

	    	$scope.pass++;

	    	if($scope.pass === 5) {

	    		$scope.pass = 0;
	    		$location.path('block');
	    	}
	    }
	})

	// get-started controller
	.controller('startCtrl', function() {
	})
	
	// get free rai
	.controller('getBlocksCtrl', function() {
	})

	// block chain page
	.controller('blockCtrl', function($http, $rootScope, $scope, $timeout) {

		// define the different button states
  		button = {

  			default: {
  				disabled: false,
  				icon: 'fa-plus-circle',
  				title: 'Process Block Chain',
  				class: 'btn-primary'
  			},

  			processing: {
  				disabled: true,
  				icon: 'fa-spin fa-spinner',
  				title: 'Processing Block Chain',
  				class: 'btn-default'
  			},

  			processed: {
  				disabled: true,
  				icon: 'fa-thumbs-up',
  				title: 'Block Chain Processed',
  				class: 'btn-success'
  			},

  			empty_block: {
  				disabled: true,
  				icon: 'fa-thumbs-down',
  				title: 'Block Chain Empty',
  				class: 'btn-danger'
  			},

  			state
  		};

  		$scope.button = button.default;

		// ensure the block chain entered is not null, undefined, or empty.
		$scope.validate = function(a) {

			if(a === undefined || a === null || a === '') {
				return false;
			} else {
				return true;
			}
		}

		// submit block chain
		$scope.submit = function() {

			// if the block chain passes validation...
			if($scope.validate($scope.blockChain)) {

				// change the button
				$scope.button = button.empty_block;
				$timeout(function() {
					$scope.button = button.default;
				}, 3000);
			}

			else {

				$scope.button = button.processing;

				var blockStr = JSON.stringify($scope.blockChain);

				payload = { 
					block: blockStr.substring(1, blockStr.length - 1)
				}

				$http.post('/api/processBlockChain', payload)

				.success(function(data, status, headers, config) {

					$scope.button = button.processed;

					$timeout(function() {
						$scope.button = button.default;
					}, 3000);
				});
			}
	
		}
	})

})();