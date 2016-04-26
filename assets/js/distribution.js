(function() {

	angular

	.module('Distribution', [
		'ngclipboard'
		])

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

		$scope.requestSuccess = false;

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

  			success: {
  				disabled: true,
  				icon: 'thumbs up',
  				title: 'Success',
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

		$scope.button = button.default;

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

				// mark request as queued
				$scope.button = button.queued;

				// create a payload
				this.payload = {
					account: $scope.account,
					response: $scope.response
				};
				
				// deliver the payload
				$http.post('/distribution', this.payload).success(function(data) {
				
					if(data.message === 'success') {

						// clear recaptcha for re-use right-away so front-end exploiters have no advantage against regular users.
						vcRecaptchaService.reload($scope.widgetId);						
						$scope.init();

						// display success button very briefly so front-end exploiters have no incentive to disable this. (purely for UX)
						$scope.button = button.success;
						$timeout(function() {
							$scope.button = button.default;
						}, 1000);

						// store my current distribution
						var CD = data.current_distribution;

						// update $scope with the current distribution
						currDist = function() {
							$scope.current_distribution = CD;
						}

						// this only happens if there is no DistributionTracker record yet
						// that can happen for 1 minute after payouts.
						if(data.no_records) {
							$scope.no_records = true;
						} else {
							$scope.no_records = false;
						}

						// store my past distributions every time. 
						// this historical data does not change like our
						// realtime current distribution does.
						if(data.past_distributions) {
							$scope.past_distributions = data.past_distributions;
						}

						// new visitor with data, set current_distributions $scope
						if(!$scope.current_distribution) {

							// set data if it exists
							if(CD) {
								currDist();
							}

							// no data yet, create a new payload.
							else {
								$scope.current_distribution = {};
								$scope.current_distribution.total_count = 0;
							}
						} 

						// returning visitor, $scope.current_distribution is set.
						else {

							// if there is no current_distribution data, payouts must have just happened.
							if(!CD) {

								// first time this will run
								if(!$scope.current_distribution.waiting) {
									$scope.current_distribution = {};
									$scope.current_distribution.waiting = true; // this makes this section run once.
									$scope.current_distribution.total_count = 0;
								}

							} else {

								// if the server payload is more up-to-date...
								// then the distribution period must have just ended.
								if(CD.started_unix > $scope.current_distribution.started_unix) {
									currDist();
								}

								// if my total count on the server is more up-to-date...
								if(CD.total_count > $scope.current_distribution.total_count || !$scope.current_distribution.total_count) {
									currDist();
								}
								// if the complete count on the server is more up-to-date...
								if(CD.complete_count > $scope.current_distribution.complete_count || !$scope.current_distribution.complete_count) {
									currDist();
								}

								// if the account they are submitting is different, update the payload.
								if($scope.account !== $scope.lastAccount) {
									currDist();
								}
							}
						}

						// increase my count
						$scope.current_distribution.total_count++;

						// save the account we're submitting to see if it changes.
						$scope.lastAccount = $scope.account;

						// activate popups
						$('.popup').popup();
					}

					// non-success
					else { 
						$scope.button = button[data.message];
						$timeout(function() {
							vcRecaptchaService.reload($scope.widgetId);
							$scope.init();
							$scope.button = button.default;
						}, 1000);
					}
				})
				.error(function(data, status) {
					console.error('Error', status, data);
				});

			} else {
				$timeout(function() {
					vcRecaptchaService.reload($scope.widgetId);
					$scope.init();
					$scope.button = button.default;
				}, 3000);
			}
		}
	});
})();