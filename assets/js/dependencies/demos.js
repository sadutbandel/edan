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

	.controller('demosCtrl', function($scope) {

		$scope.payment_account = undefined;

		// pingDemo() sends a req to /demo to either create, or continue a payment account.
		// when paid === true here, it's the end of the payment demo entirely.
		$scope.pingDemo = function() {

			// not paid yet...
			$scope.paid = false;

			// entire demo is not complete yet...
			$scope.demoComplete = false;

			//  post air to /demo
			io.socket.post('/demo', function (data, jwres) {

				// store paid status
				$scope.paid = data.paid;

				// paid === false, pingDemo() again
				if(data.paid === false) {
					$scope.pingDemo();
				} 

				// paid === true
				else {
					// the demo is complete now
					$scope.demoComplete = true;
					// clear payment account
					$scope.payment_account = undefined;
				}
				$scope.$apply();
			});
		}

		$scope.pingDemo();

		// the user clicks on this button to popup the free-rai form
		$scope.simulatePayment = function() {

			$scope.showSimulatePayment = true;
		}

		// store the payment account in $scope once it's created
		io.socket.on('account', function onServerSentEvent (account) {
			$scope.payment_account = account;
			$scope.$apply();
		});

		// when paid === true here, it's the moment payment is received, but the demo is not complete quite yet
		io.socket.on('paid', function onServerSentEvent (bool) {

			// true or false
			$scope.paid = bool;

			// if payment was made, clear the simulatePayment panel from view, and clear the payment account.
			if(bool) {

				// clear our session from server
				io.socket.post('/clear', function (data, jwres) {

					// hide simulate payment
					$scope.showSimulatePayment = false;

					// clear payment account
					$scope.payment_account = undefined;
				});
			}
			$scope.$apply();
		});
	});
})();