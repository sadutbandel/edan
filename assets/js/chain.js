;(function() {

	angular

	.module('Chain', [])

	.config(['$routeProvider', function($routeProvider) {
		$routeProvider.when('/chain', {
			templateUrl : 'templates/chain.html',
			controller: 'chainCtrl'
		});
	}])

	.controller('chainCtrl', ['$rootScope', '$scope', '$http', '$timeout', function($rootScope, $scope, $http, $timeout) {

		// define the different button states
		var button = {

			default: {
				disabled: false,
				icon: 'plus',
				title: 'Process Block Chain',
				class: 'blue'
			},

			processing: {
				disabled: true,
				icon: 'loading spinner',
				title: 'Processing Block Chain',
				class: 'grey'
			},

			processed: {
				disabled: true,
				icon: 'thumbs up',
				title: 'Block Chain Processed',
				class: 'green'
			},

			empty_block: {
				disabled: true,
				icon: 'thumbs down',
				title: 'Block Chain Empty',
				class: 'red'
			}
		};

		$scope.button = button.default;

		// ensure the block chain entered is not null, undefined, or empty.
		$scope.validate = function(a) {

			if(a === undefined || a === null || a === '' || a == '' || typeof a == 'undefined') {
				return false;
			} else {
				return true;
			}
		}

		// submit block chain
		$scope.submit = function() {

			// if the block chain doesn't pass validation...
			if(!$scope.validate($scope.blockChain)) {

				// change the button
				$scope.button = button.empty_block;
				$timeout(function() {
					$scope.button = button.default;
				}, 3000);
			} else { // if the block chain passes validation...

				$scope.button = button.processing;

				var blockStr = JSON.stringify($scope.blockChain);

				this.payload = { 
					block: blockStr.substring(1, blockStr.length - 1)
				}

				$http.post('/api/processBlockChain', this.payload).success(function(data, status, headers, config) {

					$scope.button = button.processed;

					$timeout(function() {
						$scope.button = button.default;
					}, 3000);
				});
			}
		}
	}]);

})();