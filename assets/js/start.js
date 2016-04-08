(function() {

	angular

	.module('Start', [])

	.config(function($routeProvider) {
		$routeProvider.when('/start', {
			templateUrl : 'templates/start.html',
			controller: 'startCtrl'
		})
	})

	.controller('startCtrl', function() {});
})();