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

		$('#copy')
		.popup({
			title   : 'Popup Title',
			content : 'Hello I am a popup'
		});

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

					// NOT PAID
					if(data.paid === false) {
						$scope.paymentWait();
					} 
					// PAID
					else if(data.paid === true) {
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