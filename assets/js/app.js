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
		$rootScope.faucetNumber = 'SZY2r3dduWuUKPwFbXhCeYetbdSs28zBA157cT6houLE5CunXC';
		$rootScope.rb_version = '7.2.1';
	})

	.directive('freeRaiForm', function() {

        return {

            restrict: 'E',
            templateUrl: 'templates/free-rai-form.html',
            controller: function(Button, $scope, $http, $timeout, vcRecaptchaService) {

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

		  		Button.create('free');

				Button.mode('free', 'default', { 
					'disabled' : false, 
					'icon' : 'fa-plus-circle', 
					'title': 'Request free 1 Grai', 
					'class': 'btn-primary'
				});

				Button.mode('free', 'claiming', { 
					'disabled' : true, 
					'icon' : 'fa-spin fa-spinner', 
					'title': 'Sending free Grai', 
					'class': 'btn-default'
				});

				Button.mode('free', 'claimed', { 
					'disabled' : true, 
					'icon' : 'fa-thumbs-up', 
					'title': 'Free Grai Sent', 
					'class': 'btn-success'
				});

				Button.mode('free', 'account_error', {
					'disabled' : true, 
					'icon' : 'fa-thumbs-down', 
					'title': 'Provide a valid account id', 
					'class': 'btn-danger'
				});

				Button.mode('free', 'recaptcha_error', { 
					'disabled' : true, 
					'icon' : 'fa-thumbs-down', 
					'title': 'Complete the reCaptcha', 
					'class': 'btn-danger'
				});

				Button.mode('free', 'recaptcha_error', { 
					'disabled' : true, 
					'icon' : 'fa-thumbs-down', 
					'title': 'Complete the reCaptcha', 
					'class': 'btn-danger'
				});

				Button.mode('free', 'not_free', { 
					'disabled' : true, 
					'icon' : 'fa-thumbs-down', 
					'title': 'RaiBlocks are not free right now', 
					'class': 'btn-danger'
				});

				Button.change('free', 'default');

				$scope.validateAccount = function() {
					if($scope.account == null || $scope.account == '') {
						return false;
					} else {
						return true;
					}
				}

				$scope.validateResponse = function() {
					if($scope.response == null || $scope.response == '') {
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

				// submit free coin request
				$scope.submit = function () {

					$scope.validateForm();

					if($scope.account == null || $scope.account == '') {

						Button.change('free', 'account_error');

						$timeout(function() {
							Button.change('free', 'default');
						}, 3000);

					} else if($scope.response == null || $scope.response == '') {

						Button.change('free', 'recaptcha_error');

						$timeout(function() {
							Button.change('free', 'default');
						}, 3000);

					} else {

						Button.change('free', 'claiming');

						payload = {};
						payload.account = $scope.account;
						payload.response = $scope.response;
						
						$http.post('/freerai', payload)

						.success(function(data) {

							$timeout(function() {

								Button.change('free', data.message);

								$timeout(function() {
									vcRecaptchaService.reload($scope.widgetId);
									$scope.init();
									Button.change('free', 'default');
								}, 3000);

							}, 3000);
						})
						.error(function(data, status) {
							console.error('Error', status, data);
						})
						.finally(function() {
							
						});
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
	.controller('blockCtrl', function(Button, $http, $rootScope, $scope, $timeout) {

		Button.create('block');

		Button.mode('block', 'default', { 
			'disabled' : false, 
			'icon' : 'fa-plus-circle', 
			'title': 'Process Block Chain', 
			'class': 'btn-primary'
		});

		Button.mode('block', 'processing', { 
			'disabled' : true, 
			'icon' : 'fa-spin fa-spinner', 
			'title': 'Processing Block Chain', 
			'class': 'btn-default'
		});

		Button.mode('block', 'processed', { 
			'disabled' : true, 
			'icon' : 'fa-thumbs-up', 
			'title': 'Block Chain Processed', 
			'class': 'btn-success'
		});

		Button.mode('block', 'empty_block', { 
			'disabled' : true, 
			'icon' : 'fa-thumbs-down', 
			'title': 'Block Chain Empty', 
			'class': 'btn-danger'
		});

		Button.change('block', 'default');

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
				Button.change('block', 'empty_block');
				$timeout(function() {
					Button.change('block', 'default');
				}, 3000);
			}

			else {

				Button.change('block', 'processing');
				var blockStr = JSON.stringify($scope.blockChain);
				blockStr = blockStr.substring(1, blockStr.length - 1);
				$http.post('/api/processBlockChain', { block: blockStr })
				.success(function(data, status, headers, config) {
					Button.change('block', 'processed');
					$timeout(function() {
						Button.change('block', 'default');
					}, 3000);
				});
			}
	
		}
	})

	// dynamic buttons
	.service('Button', function($q, $rootScope, vcRecaptchaService) {

		// create button object
		this.create = function(name) {
			$rootScope[name] = {};
		}

		// define all modes in rootScope
		this.mode = function(name, mode, properties) {

			$rootScope[name][mode] = {};

			return $q(function(resolve, reject) {
				angular.forEach(properties, function(val, key) {
					$rootScope[name][mode][key] = val;
				});
 				resolve();
  			});
		}

		// change the button status
		this.change = function(name, mode) {

			return $q(function(resolve, reject) {
				$rootScope[name].active = $rootScope[name][mode];
 				resolve();
  			});
		}
	})

})();