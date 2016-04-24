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

				$scope.button = button.queued;

				this.payload = {
					account: $scope.account,
					response: $scope.response
				};
				
				$http.post('/distribution', this.payload).success(function(data) {

					// possible return response: {"message":"success", lastRan":1460422800,"hoursSinceLastRan":18, past_distributions: [ objs ] }
					if(data.past_distributions) {
						
						// clear recaptcha for re-use right-away so front-end exploiters have no advantage.
						vcRecaptchaService.reload($scope.widgetId);						
						$scope.init();

						// display success button very briefly so front-end exploiters have no incentive to disable this. (purely for UX)
						$scope.button = button.success;
						$timeout(function() {
							$scope.button = button.default;
						}, 1000);


						var total_count;
					
						// if we have already gotten current_distribution information...
						if($scope.current_distribution){

							// check if the period the data returned is the same as the one we have in store
							// if we're in a new distribution period....
							if(data.current_distribution.started_unix !== $scope.current_distribution.started_unix) {
								
							} 
							// if we're in the same period as when we checked
							else {

								total_count = $scope.current_distribution.total_count;

								// check if our stored count is greater than what the server is returning
								// this difference will always increase until a minute has gone by in which the server
								// will return the most actual up-to-date count. The UI count should match though.
								if(total_count >= data.current_distribution.total_count) {

									var diff = total_count - data.current_distribution.total_count;

									// overwrite our assumed count with the real count.
									if(diff >= 10) {
										total_count = data.current_distribution.total_count;
									}

									data.current_distribution.total_count = total_count;
								}
							}
						}

						// increase my total count.
						data.current_distribution.total_count++;

						// store (or re-store) current and past distributions
						$scope.current_distribution = data.current_distribution;
						$scope.past_distributions = data.past_distributions;

						//$('.copy_hash').popup({ popup:true }); // activate popups
						
					} else { // non-success messages
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