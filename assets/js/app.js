 (function() {

	angular

	.module('Raiblocks', [ // primary module
		'bootstrap', // angular application boostrap
		'routeHelper', // route-assist
		'vcRecaptcha', // google recaptcha
		'ngRoute', // angular routing
		'Demos', // use-case demos
		'Explorer', // block-chain explorer
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
	})

	.run(function($rootScope, logo) {

		$('.ui.sidebar').sidebar();
		$('.ui.sidebar a').on('click', function() {
			$('.ui.sidebar').sidebar('hide');
		});

		// grab logo from bootstrap
		$rootScope.logo = logo;

		// establish public app-wide variables
		$rootScope.recaptchaKey = '6LcPNAsTAAAAANCpxZY3SMikIjg5a0T9XTnjM-v4';
		$rootScope.faucetNumber = 'xrb_35jjmmmh81kydepzeuf9oec8hzkay7msr6yxagzxpcht7thwa5bus5tomgz9';
		$rootScope.rb_version = '7.3.2';
	})

	.directive('freeRaiForm', function() {

        return {

            restrict: 'E',
            templateUrl: 'templates/free-rai-form.html',
            controller:  ['$scope', '$http', '$timeout', 'vcRecaptchaService', function($scope, $http, $timeout, vcRecaptchaService) {

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
		  				icon: 'add circle',
		  				title: 'Request',
		  				class: 'blue'
		  			},

		  			claiming: {
		  				disabled: true,
		  				icon: 'loading spinner',
		  				title: 'Sending',
		  				class: 'grey'
		  			},

		  			claimed: {
		  				disabled: true,
		  				icon: 'thumbs up',
		  				title: 'Sent',
		  				class: 'green'
		  			},

		  			account_error: {
		  				disabled: true,
		  				icon: 'thumbs down',
		  				title: 'Invalid account',
		  				class: 'red'
		  			},

		  			recaptcha_error: {
		  				disabled: true,
		  				icon: 'thumbs down',
		  				title: 'Incomplete reCaptcha',
		  				class: 'red'
		  			},

		  			not_free: {
		  				disabled: true,
		  				icon: 'thumbs down',
		  				title: 'RaiBlocks valuable',
		  				class: 'red'
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

								if(data.statusCode === 200) {
									$scope.button = button.claimed;
								} else {
									$scope.button = button[data.message];
								}

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
            }]
        };
    })

	// allow entry to the block chain page
	.controller('homeCtrl', ['$rootScope', '$scope', '$location', function($rootScope, $scope, $location) {

		$scope.pass = 0;
	    $scope.process = function() {

	    	$scope.pass++;

	    	if($scope.pass === 5) {

	    		$scope.pass = 0;
	    		$location.path('block');
	    	}
	    }
	}])

	// get started controller
	.controller('startCtrl', function($scope) {

		$scope.toggleTab = function(tab) {
			$scope.tab = tab;
		}

		var githubLink = 'https://github.com/clemahieu/raiblocks/releases/download/V' + $scope.rb_version + '/rai-' + $scope.rb_version + '-';

		$scope.platforms = [
			{
				name: 'OSX',
				icon: 'apple',
				link: githubLink + 'Darwin.dmg'
			},
			{
				name: 'Windows',
				icon: 'windows',
				link: githubLink + 'win64.exe'
			},
			{
				name: 'Linux',
				icon: 'linux',
				link: githubLink + 'Linux.tar.bz2'
			}
		];
	})

	// block chain page
	.controller('blockCtrl', ['$rootScope', '$scope', '$http', '$timeout', function($http, $rootScope, $scope, $timeout) {

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
	}])

})();