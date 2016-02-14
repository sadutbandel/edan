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

		$scope.paymentBegin = function() {

			console.log('Payment Begin');

			return $q(function(resolve, reject) {
				io.socket.post('/paymentBegin', function (data, jwres) {
					$scope.payment_account = data.account;
					$scope.$apply();
					console.log('resolving payment begin');
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentWait = function() {

			console.log('Payment Wait');
			
			return $q(function(resolve, reject) {

				io.socket.post('/paymentWait', function (data, jwres) {
					$scope.paid = data.paid;

					// NOT PAID
					if(data.paid === false) {
						$scope.paymentWait();
					} 
					// PAID
					else if(data.paid === true) {
						$scope.paymentFinish(data.account);
					}
					$scope.$apply();
					console.log('resolving payment wait');
					resolve();
				});
			});

			return promise;
		}

		$scope.paymentFinish = function(account) {

			console.log('Payment Finish');
			
			io.socket.post('/paymentFinish', { account: account }, function (data, jwres) {
				$scope.payment_account = undefined;
				$scope.$apply();
			});
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