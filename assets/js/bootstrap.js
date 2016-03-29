(function() {

	var app = 'Raiblocks';
    var bootstrap = angular.module('bootstrap', []);
    var initInjector = angular.injector(['ng']);
    var $q = initInjector.get(['$q']);
    var $http = initInjector.get('$http');

	bootstrapApplication();

    function bootstrapApplication() {
        angular.element(document).ready(function() {
            angular.bootstrap(document, [app]);
        });
    }
}());