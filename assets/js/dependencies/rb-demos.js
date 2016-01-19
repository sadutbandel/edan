(function() {

	angular

	.module('RBDemos', [])

	.config(function($routeProvider) {
		$routeProvider.when('/demos', {
			templateUrl : 'templates/demos.html'
		})
	})

	.run(function(){})

	.directive('payRemoveAds', function() {

		return {

			restrict: 'E',
			templateUrl: 'templates/pay-remove-ads.html',
			controller: function($q, $scope, $interval) {

				$scope.initializeDemo = function() {
					console.log('Initializing Demo');
					$scope.paid = undefined;
					io.socket.post('/paymentdemo');
				}

				$scope.initializeDemo();

				// store the payment account in $scope once it's created
				io.socket.on('account', function onServerSentEvent (account) {
					console.log('account = ' + account);
					$scope.payment_account = account;
					$scope.$apply();
				});

				// mark paid as true once a paid event is emitted to us
				io.socket.on('paid', function onServerSentEvent (status) {
					console.log('paid = ' + status);
					$scope.paid = status;
					$scope.$apply();
				});

				// check for changes to $scope.paid
				$scope.$watch('paid', function(paid) {
					// payment didn't come through...
					if(paid === false) {
						$scope.initializeDemo();
					}
				});

			}
		};
	})

})();
