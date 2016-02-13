(function() {

	angular

	.module('RBDemos', [
		'ngclipboard',
		'angular-google-adsense'
		])

	.config(function($routeProvider) {
		$routeProvider.when('/demos', {
			templateUrl : 'templates/demos.html',
			controller: 'demosCtrl'
		})
	})

	.controller('demosCtrl', function($scope, $q) {

		$scope.initialized = false;

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
					$scope.paid = data.paid;
					if(data.paid === false) {
						$scope.paymentWait();
					} else if(data.paid === true) {
						$scope.paymentFinish(data.account);
					}
					$scope.$apply();
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentFinish = function(account) {

			io.socket.post('/paymentFinish', { account: account }, function (data, jwres) {
				$scope.payment_account = undefined;
			});
		}

		$scope.initialize = function() {
			$scope.initialized = true; // triggers showing of demo itself. only reset on refresh or demo "quit"
			$scope.showSimulatePayment = false; // the form for simulating a payment using the free-rai form
			$scope.payment_account = undefined; // no payment account by default
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