(function() {

	angular

	.module('routeHelper', [])

	.run(['$rootScope', '$location', '$templateCache', function($rootScope, $location, $templateCache) {

		// detect the route change and perform logic prior to route-change completion
		$rootScope.$on("$locationChangeStart", function(e, newUrl, oldUrl) {

			// find the path and get rid of the trailing slash
			var path = $location.path().replace('/', '');

			// give home a name (aww)
			if(path === '') { path = 'home'; }

			// store the path for app-wide use
			$rootScope.path = path;

			// prevent caching of routes templates by removing them all.
			$templateCache.removeAll();
		});
	}]);

})();