(function() {

	angular

	.module('Distribution', [
		'ngclipboard'
		])

	.controller('distributionCtrl', ['$rootScope', '$filter', '$interval', '$scope', '$timeout', '$location', 'vcRecaptchaService', function($rootScope, $filter, $interval, $scope, $timeout, $location, vcRecaptchaService) {
		
		// the button that explains the faucet which opens a modal
		$scope.howFaucet = function(bool) {
			if(bool) {
				$('#how-faucet').modal('show');
			} else {
				$('#how-faucet').modal('hide');
			}
		}

		// fetch the available supply distributed
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

		// empties the recaptcha response and widgetID
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
  			},

  			server_error: {
  				disabled: true,
  				icon: 'warning sign',
  				title: 'Server error',
  				class: 'red'
  			}
  		};

  		//$scope.button = button.faucetoff;
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
					response: $scope.response,
					_csrf: $rootScope.csrf
				};
								
				// deliver the payload
				io.socket.post('/distribution', this.payload, function (data, jwres) {

					var message = data.message,
					records = data.records;

					if(message === 'success') {

						// clear recaptcha for re-use right-away so front-end exploiters have no advantage against regular users.
						vcRecaptchaService.reload($scope.widgetId);						
						$scope.init();

						// display success button very briefly so front-end exploiters have no incentive to disable this. (purely for UX)
						$scope.button = button.success;
						$timeout(function() {
							$scope.button = button.default;
						}, 1000);

						// convert unix timestamps to milliseconds
						angular.forEach(records, function(obj, key) {
							records[key].ended_unix = obj.ended_unix * 1000;
							records[key].paid_unix = obj.paid_unix * 1000;
							records[key].started_unix = obj.started_unix * 1000;
						});

						// my current distribution data
						$scope.current_distribution = records[0];
						records.splice(0,1);
						// my past distributions data
						$scope.past_distributions = records;

						// activate popups
						$('.popup').popup();
						$scope.$apply();
					}

					// non-success
					else { 
						$scope.button = button[data.message];
						$scope.$apply();
						$timeout(function() {
							vcRecaptchaService.reload($scope.widgetId);
							$scope.init();
							$scope.button = button.default;
							$scope.$apply();
						}, 1000);
					}
				});

			} else {
				$timeout(function() {
					vcRecaptchaService.reload($scope.widgetId);
					$scope.init();
					$scope.button = button.default;
				}, 3000);
			}
		}
	}]);

})();