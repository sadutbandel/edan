(function() {

	angular

	.module('Demos', [
		'ngclipboard'
		])

	.config(function($routeProvider) {
		$routeProvider.when('/demos', {
			templateUrl : 'templates/demos.html',
			controller: 'demosCtrl'
		})
	})

	/**
	 * [description]
	 * @param  {[type]} $rootScope [description]
	 * @param  {[type]} $scope     [description]
	 * @param  {[type]} $q         [description]
	 * @param  {[type]} $http      [description]
	 * @param  {[type]} $timeout   [description]
	 * @return {[type]}            [description]
	 */
	.controller('demosCtrl', function($rootScope, $scope, $q, $http, $timeout) {

		// assume the faucet is on by default
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

			$http.post('/demo').success(function(data) {

				if(data.statusCode === 200) {
					$scope.paid = true;
					$scope.account = null;
					$scope.button = button.default;
				} else {
					$scope.button = button[data.message];
					$timeout(function() {
						$scope.account = null;
						$scope.button = button.default;
					}, 3000);
				}
			})
			.error(function(data, status) {
				console.error('Error', status, data);
			});
		}

		$scope.paymentBegin = function() {

			return $q(function(resolve, reject) {
				io.socket.post('/paymentBegin', function (data, jwres) {
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

				io.socket.post('/paymentWait', function (data, jwres) {

					$scope.paid = data.response.paid;

					// NOT PAID
					if(data.response.paid === false) {
						$scope.paymentWait();
					} 
					// PAID
					else if(data.response.paid === true) {
						$scope.paymentFinish(data.account);
					}
					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentFinish = function(account) {

			$scope.payment_account = undefined;
			io.socket.post('/paymentFinish', { account: account });
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
	});

})();