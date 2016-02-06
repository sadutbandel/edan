(function() {

	angular

	.module('RBDemos', [
		'ngclipboard'
		])

	.config(function($routeProvider) {
		$routeProvider.when('/demos', {
			templateUrl : 'templates/demos.html',
			controller: 'demosCtrl'
		})
	})

	.controller('demosCtrl', function($scope, $q) {

		$scope.payment_account = undefined;
		$scope.paid = false;
		$scope.demoComplete = false;

		// begin a payment if no account exists yet
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

		// initiates a payment wait
		$scope.paymentWait = function() {

			return $q(function(resolve, reject) {
				io.socket.post('/paymentWait', function (data, jwres) {
					$scope.paid = data.paid;
					if(data.paid === false) {
						$scope.paymentWait();
					} else if(data.paid === true) {
						$scope.paymentFinish();
					}
					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		// recapture funds and end payment
		$scope.paymentFinish = function() {

			return $q(function(resolve, reject) {
				io.socket.post('/paymentFinish', function (data, jwres) {
					$scope.demoComplete = true;
					$scope.payment_account = undefined;
					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		// kick it off
		$scope.paymentBegin().then(function() {
			$scope.paymentWait();
		});

		// the user clicks on this button to popup the free-rai form
		$scope.simulatePayment = function() {

			$scope.showSimulatePayment = true;
		}
	});

})();