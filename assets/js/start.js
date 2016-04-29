(function() {

	angular

	.module('Start', [])

	.config(['$routeProvider', function($routeProvider) {
		$routeProvider.when('/start', {
			templateUrl : 'templates/start.html',
			controller: 'startCtrl'
		});
	}])

	.controller('startCtrl', function() {});
})();