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

			templateUrl: 'templates/pay-remove-ads.html',
			controller: function($q, $scope, $interval) {

				$scope.initializeDemo = function() {

					$scope.paid = undefined;

					io.socket.post('/paymentdemo', function (data, jwres){
						if(data.paid === false) {
							$scope.initializeDemo();
						}
						$scope.paid = data.paid;
						$scope.$apply();
					});
				}

				$scope.initializeDemo();

				// store the payment account in $scope once it's created
				io.socket.on('account', function onServerSentEvent (account) {
					//console.log('account = ' + account);
					$scope.payment_account = account;
					$scope.$apply();
				});
				
			},
			restrict: 'E'
		};
	})
})();