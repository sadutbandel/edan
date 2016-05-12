(function() {

	angular

	.module('FreemiumAdsDemo', [
		'ngclipboard'
		])

	// how do we initialize this? every time we load the page?
	.controller('fadCtrl', ['$rootScope', '$scope', '$q', '$timeout', function($rootScope, $scope, $q, $timeout) {

		// assume the faucet is ON by default
		$scope.faucetOff = false;

		// clear any blocks upon page refresh
		delete $rootScope.block;

		// define the different button states
  		var button = {

  			default: {
  				disabled: false,
  				icon: 'play',
  				title: 'Simulate Payment',
  				class: 'blue'
  			},

  			paying: {
  				disabled: true,
  				icon: 'loading spinner',
  				title: 'Paying',
  				class: 'grey'
  			}
  		};

  		// set default button state
  		$scope.button = button.default;

  		// simulate real payment
  		$scope.simulatePayment = function () {

  			// 'paying' status
			$scope.button = button.paying;

			io.socket.post('/demo', $rootScope._csrf, function (data, jwres) {
				if(data.statusCode === 200) {
					$scope.paid = true;
					$scope.account = null;
					$scope.button = button.default;
					$scope.$apply();
				} else {
					$scope.button = button[data.message];
					$scope.$apply();
					$timeout(function() {
						$scope.account = null;
						$scope.button = button.default;
						$scope.$apply();
					}, 3000);
				}
			});
		}

		$scope.paymentBegin = function() {

			return $q(function(resolve, reject) {

				io.socket.post('/paymentBegin', $rootScope._csrf, function (data, jwres) {
					if(data.statusCode === 400) {
						$scope.faucetOff = true;
					} else {
						$scope.payment_account = data.account;
					}
					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentWait = function() {
			
			return $q(function(resolve, reject) {

				io.socket.post('/paymentWait', $rootScope._csrf, function (data, jwres) {
					if(data.statusCode === 400) {
						$scope.faucetOff = true;
					} else {

						$scope.paid = data.response.paid;

						// NOT PAID
						if(data.response.paid === false) {
							$scope.paymentWait();
						} 
						// PAID
						else if(data.response.paid === true) {
							$scope.paymentFinish(data.account);
						}
					}

					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentFinish = function(account) {

			$scope.payment_account = undefined;
			io.socket.post('/paymentFinish', { account: account, _csrf: $rootScope.csrf });
		}

		$scope.initialize = function(bool) {

			// start demo
			if(bool) {
				$scope.initialized = true; // triggers showing of demo itself. only reset on refresh or demo "quit"
				$scope.payment_account = undefined; // no payment account by default
				$scope.paid = false; // not paid by default
				$scope.paymentBegin().then(function() {
					$scope.paymentWait();
				});
			} 
			// read again
			else {
				$scope.payment_account = undefined;
				$scope.initialized = false;
				$scope.paid = false;
			}
		}

		$scope.initialize(true);

	}]);

})();