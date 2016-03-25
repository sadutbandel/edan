(function() {

	angular

	.module('Demos', [
		'ngclipboard',
		'angular-google-adsense'
		])

	.config(function($routeProvider) {
		$routeProvider.when('/demos', {
			templateUrl : 'templates/demos.html',
			controller: 'demosCtrl'
		})
	})

	.controller('demosCtrl', function($rootScope, $scope, $q, $http, $timeout) {

		// clear any blocks upon page refresh
		delete $rootScope.block;

		// define the different button states
  		button = {

  			default: {
  				disabled: false,
  				icon: 'add circle',
  				title: 'Pay',
  				class: 'blue'
  			},

  			paying: {
  				disabled: true,
  				icon: 'loading spinner',
  				title: 'Paying',
  				class: 'grey'
  			},

  			paid: {
  				disabled: true,
  				icon: 'thumbs up',
  				title: 'Paid',
  				class: 'green'
  			}
  		};

  		$scope.button = button.default;

  		$scope.submit = function () {

			$scope.button = button.paying;

			$http.post('/demo').success(function(data) {

				$timeout(function() {

					if(data.statusCode === 200) {
						$scope.button = button.paid;
						$scope.paid = true;
					} else {
						$scope.button = button[data.message];
					}

					$timeout(function() {
						$scope.account = null;
						$scope.button = button.default;
					}, 3000);

				}, 3000);
			})
			.error(function(data, status) {
				console.error('Error', status, data);
			});
		}

		$scope.paymentBegin = function() {

			return $q(function(resolve, reject) {
				io.socket.post('/paymentBegin', function (data, jwres) {
					$scope.payment_account = data.account;
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

		$scope.initialize = function() {

			$scope.initialized = true; // triggers showing of demo itself. only reset on refresh or demo "quit"
			$scope.payment_account = undefined; // no payment account by default
			$scope.showSimulatePayment = false; // the form for simulating a payment using the free-rai form
			$scope.paid = false; // not paid by default
			$scope.paymentBegin().then(function() {
				$scope.paymentWait();
			});
		}

		$scope.simulatePayment = function() {
			$scope.showSimulatePayment = true;
		}
	});

})();