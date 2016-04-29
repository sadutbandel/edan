(function() {

	angular

	.module('Wallet', [])

	.config(function($routeProvider) {
		$routeProvider.when('/wallet', {
			templateUrl : 'templates/wallet.html',
			controller: 'walletCtrl'
		})
	})

	.controller('walletCtrl', function($rootScope, $scope, $filter) {

		var githubLink = 'https://github.com/clemahieu/raiblocks/releases/download/V' + $scope.rb_version + '/rai-' + $scope.rb_version + '-';

		$scope.platforms = [
			{
				icon: 'apple',
				link: githubLink + 'Darwin.dmg'
			},
			{
				name: '64',
				icon: 'windows',
				link: githubLink + 'win64.exe'
			},			{
				name: '32',
				icon: 'windows',
				link: githubLink + 'win32.exe'
			},
			{
				icon: 'linux',
				link: githubLink + 'Linux.tar.bz2'
			}
		];
	});
})();