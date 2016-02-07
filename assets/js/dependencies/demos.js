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

			io.socket.post('/paymentFinish', { account: account })
		}

		$scope.initialize = function() {
			$scope.showSimulatePayment = false;
			$scope.payment_account = undefined;
			$scope.paid = false;
			$scope.paymentBegin().then(function() {
				$scope.paymentWait();
			});
		}

		$scope.initialize();

		$scope.simulatePayment = function() {

			$scope.showSimulatePayment = true;
		}
	});

})();