(function() {

	angular

	.module('Distribution', [])

	.config(function($routeProvider) {
		$routeProvider.when('/distribution', {
			templateUrl : 'templates/distribution.html',
			controller: 'distributionCtrl'
		})
	})

	.controller('distributionCtrl', function($rootScope, $filter, $interval, $scope, $http, $timeout, $location, vcRecaptchaService) {

		$scope.howFaucet = function(bool) {
			if(bool) {
				$('#how-faucet').modal('show');
			} else {
				$('#how-faucet').modal('hide');
			}
		}

		$scope.freeRaiVisible = true;

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

		$scope.init = function () {
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

  			queued: {
  				disabled: true,
  				icon: 'loading spinner',
  				title: 'Queued',
  				class: 'grey'
  			},

  			processed: {
  				displaybled: true,
  				icon: 'thumbs up',
  				title: 'Processed',
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

  			faucetoff: {
  				disabled: true,
  				icon: 'warning sign',
  				title: 'Faucet is off',
  				class: 'red'
  			},

  			try_again: {
  				disabled: true,
  				icon: 'warning sign',
  				title: 'Try again',
  				class: 'orange'
  			}
  		};

  		$scope.wait = function(until) {

			// if a unix timestamp was passed...
			if(until) {

				// every second, re-calculate the time to wait
				var waitUntilPromise = $interval(function() {

					var untilThen = until - Math.floor(Date.now() / 1000);

					// if the wait timer has expired, show the form again
					if(untilThen <= 0) {
						$interval.cancel(waitUntilPromise);
						$scope.freeRaiVisible = true;
						$scope.button = button.default;

					} else {
						$scope.wait_hdr = 'Request succeeded';
						$scope.wait_msg = 'Please wait ' + untilThen + ' seconds';
						$scope.freeRaiVisible = false;
						vcRecaptchaService.reload($scope.widgetId);
						$scope.init();
  					}
					},1000);
				} 
  			// no unix timestamp passed...
  			else {
	  			$scope.button = button.try_again;
	  			$timeout(function() {
	  				vcRecaptchaService.reload($scope.widgetId);
	  				$scope.init();
					$scope.button = button.default;
				}, 3000);
			}
		}

  		$scope.button = button.default;
  		
  		// account can't be null, nothing, or starting with anything but 'xrb_'
  		$scope.validateAccount = function() {
  			if($scope.account === undefined || $scope.account === null || $scope.account === '' || $scope.account.lastIndexOf('xrb_', 0) !== 0) {
  				$scope.button = button.account_error;
  				return false;
  			} else {
  				return true;
  			}
  		}

  		$scope.validateResponse = function() {
  			if($scope.response === undefined || $scope.response === null || $scope.response === '') {
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

				$scope.button = button.queued;

				this.payload = {
					account: $scope.account,
					response: $scope.response
				};
				
				$http.post('/distribution', this.payload).success(function(data) {

					if(data.statusCode === 200) {
						$rootScope.block = data.response.block;
						$scope.button = button.processed;
					} else {

						// possible returnsponse: {"until":1460488859,"message":"wait","count":6,"lastRan":1460422800,"hoursSinceLastRan":18}
						if(data.count) {
							$scope.count = data.count;
						}

						$scope.hoursSinceLastRan = data.hoursSinceLastRan;

						// if there is an 'until' time to wait for, run dynamic
						if(data.until) {
							$scope.wait(data.until); // a unique, dynamic function
						} else {
							$scope.button = button[data.message];
							$timeout(function() {
								vcRecaptchaService.reload($scope.widgetId);
								$scope.init();
								$scope.button = button.default;
							}, 3000);
						}
					}
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
			$location.path('explorer');
		}
	});
})();