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
		.when('/process', {
			templateUrl : 'templates/process.html',
			controller  : 'processCtrl'
		})
	})

	.run(function($rootScope) {

		$('.ui.sidebar').sidebar();
		$('.ui.sidebar a').on('click', function() {
			$('.ui.sidebar').sidebar('hide');
		});

		// establish public app-wide variables
		$rootScope.recaptchaKey = '6LcPNAsTAAAAANCpxZY3SMikIjg5a0T9XTnjM-v4';
		$rootScope.faucetNumber = 'xrb_35jjmmmh81kydepzeuf9oec8hzkay7msr6yxagzxpcht7thwa5bus5tomgz9';
		$rootScope.rb_version = '7.4.3';
		$rootScope.total_faucet = 340282366; // used for visual display of distribution # on get started
	})

	.directive('freeRaiForm', function() {

		return {

			restrict: 'E',
			templateUrl: 'templates/free-rai-form.html',
			controller:  ['$rootScope', '$scope', '$http', '$timeout', '$location', 'vcRecaptchaService', function($rootScope, $scope, $http, $timeout, $location, vcRecaptchaService) {

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
		  		var button = {

		  			default: {
		  				disabled: false,
		  				icon: 'add circle',
		  				title: 'Request',
		  				class: 'blue'
		  			},

		  			claiming: {
		  				disabled: true,
		  				icon: 'loading spinner',
		  				title: 'Queued',
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
		  			},

		  			wait: {
		  				disabled: true,
		  				icon: 'warning sign',
		  				title: 'Please try again',
		  				class: 'yellow'
		  			},

		  			faucetoff: {
		  				disabled: true,
		  				icon: 'warning sign',
		  				title: 'Faucet is off',
		  				class: 'red'
		  			},

		  			premature: function(waitTime) {
		  				return {
		  					disabled: true,
		  					icon: 'warning sign',
		  					title: 'Wait ' + waitTime + ' seconds',
		  					class: 'yellow'
		  				};
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

						this.payload = {
							account: $scope.account,
							response: $scope.response
						};
						
						$http.post('/freerai', this.payload).success(function(data) {

							$timeout(function() {

								if(data.statusCode === 200) {
									$rootScope.block = data.response.block;
									$scope.button = button.claimed;
								} else {

									// if premature, display required wait-time
									if(data.message === 'premature') {
										$scope.button = button.premature(data.wait);
									} else {
										$scope.button = button[data.message];
									}
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

				$scope.exploreBlock = function() {
					$location.path('block-explorer');
				}
			}]
		};
	})

	// allow entry to the block chain page
	.controller('homeCtrl', ['$rootScope', '$scope', '$location', function($rootScope, $scope, $location) {
		$('.social').popup({
			position: 'bottom center'
		});
	}])

	// get started controller
	.controller('startCtrl', function($rootScope, $scope, $filter) {

		// clear any blocks upon page refresh
		delete $rootScope.block;

		// fetch the available supply
		io.socket.get('/api/available_supply', function (resData, jwres){

			$scope.available_supply_absolute = resData;
			var percentage_distributed = resData / $rootScope.total_faucet * 100;
			$scope.percentage_distributed = $filter('number')(percentage_distributed, 3);

			$scope.$apply();
			$('#distributed_perc').progress({
				showActivity: false,
				percent: $scope.percentage_distributed
			});
		});

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
			name: 'Win32',
			icon: 'windows',
			link: githubLink + 'win32.exe'
		},
		{
			name: 'Win64',
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
	.controller('processCtrl', function($rootScope, $scope, $http, $timeout) {

		// define the different button states
		var button = {

			default: {
				disabled: false,
				icon: 'plus',
				title: 'Process Block Chain',
				class: 'blue'
			},

			processing: {
				disabled: true,
				icon: 'loading spinner',
				title: 'Processing Block Chain',
				class: 'grey'
			},

			processed: {
				disabled: true,
				icon: 'thumbs up',
				title: 'Block Chain Processed',
				class: 'green'
			},

			empty_block: {
				disabled: true,
				icon: 'thumbs down',
				title: 'Block Chain Empty',
				class: 'red'
			}
		};

		$scope.button = button.default;

		// ensure the block chain entered is not null, undefined, or empty.
		$scope.validate = function(a) {

			if(a === undefined || a === null || a === '' || a == '' || typeof a == 'undefined') {
				return false;
			} else {
				return true;
			}
		}

		// submit block chain
		$scope.submit = function() {

			// if the block chain doesn't pass validation...
			if(!$scope.validate($scope.blockChain)) {

				// change the button
				$scope.button = button.empty_block;
				$timeout(function() {
					$scope.button = button.default;
				}, 3000);
			}

			// if the block chain passes validation...
			else {

				$scope.button = button.processing;

				var blockStr = JSON.stringify($scope.blockChain);

				this.payload = { 
					block: blockStr.substring(1, blockStr.length - 1)
				}

				$http.post('/api/processBlockChain', this.payload).success(function(data, status, headers, config) {

					$scope.button = button.processed;

					$timeout(function() {
						$scope.button = button.default;
					}, 3000);
				});
			}

		}
	})

})();