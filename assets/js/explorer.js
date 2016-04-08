(function() {

	angular

	.module('Explorer', [])

	.config(function($routeProvider) {
		$routeProvider.when('/explorer', {
			templateUrl : 'templates/explorer.html',
			controller: 'explorerCtrl'
		})
	})

	.controller('explorerCtrl', function($rootScope, $scope, $q, $timeout) {
      
      // define the different button states
      button = {

         default: {
            disabled: false,
            icon: 'search',
            title: 'Explore',
            class: 'blue'
         },

         exploring: {
            disabled: true,
            icon: 'loading spinner',
            title: 'Exploring',
            class: 'grey'
         },

         explored: {
            disabled: true,
            icon: 'thumbs up',
            title: 'Explored',
            class: 'green'
         },

         invalid_hash: {
            disabled: true,
            icon: 'thumbs down',
            title: 'Invalid hash',
            class: 'red'
         },

         no_hash: {
            disabled: true,
            icon: 'thumbs down',
            title: 'No hash',
            class: 'red'
         },

         missing_block: {
            disabled: true,
            icon: 'thumbs down',
            title: 'Block missing',
            class: 'red'
         }
      };

      $scope.newSearch = function() {

         $scope.button = button.default;
         delete $scope.response;
         delete $scope.hash;
         $scope.submitted = false;
      }

      $scope.newSearch();

      responseTemplate = {
         type: {
            icon: 'tags'
         },
         previous: {
            icon: 'long arrow left'
         },
         destination: {
            icon: 'bullseye'
         },
         balance: {
            icon: 'resize horizontal'
         },
         work: {
            icon: 'suitcase'
         },
         signature: {
            icon: 'write'
         },
         source: {
            icon: 'sun'
         },
         representative: {
            icon: 'clone'
         },
         account: {
            icon: 'university'
         }
      };

      // explore a specific block chain hash    
      $scope.explore = function() {

         return $q(function(resolve, reject) {

            $scope.response = JSON.parse(JSON.stringify(responseTemplate));

            if($scope.hash) {

               $scope.button = button.exploring;

               io.socket.post('/blockExplorer', { hash: $scope.hash }, function (data, jwres) {

                  // fail
                  if(data.statusCode === 400) {

                     if(data.response === 'Bad hash number') {

                        $scope.button = button.invalid_hash;
                        $scope.$apply();

                        $timeout(function() {
                           $scope.button = button.default;
                           $scope.$apply();
                           resolve();
                        }, 3000);
                     } else if(data.response === 'Block not found') {

                        $scope.button = button.missing_block;
                        $scope.$apply();

                        $timeout(function() {
                           $scope.button = button.default;
                           $scope.$apply();
                           resolve();
                        }, 3000);
                     }
                  }

                  // success
                  else if(data.statusCode === 200) {

                     // convert string json to object
                     contents = JSON.parse(data.response.contents);

                     // iterate through each item in the object and store the value
                     angular.forEach(contents, function(val, key) {
                        $scope.response[key].value = val;
                     });

                     // remove any unnecessary keys
                     angular.forEach($scope.response, function(obj, key) {
                        if(!obj.value) {
                           delete $scope.response[key];
                        }
                     });

                    $scope.button = button.explored;
                    $scope.submitted = true;
                    $scope.$apply();

                    $timeout(function() {
                        $scope.button = button.default;
                        $scope.$apply();
                        resolve();
                     }, 3000);
                  }
               });
            }
         });

         return promise;
      }

      // if a block hash is set from a free rai form completion, explore automatically
      if($rootScope.block) {
         $scope.hash = $rootScope.block;
         $scope.explore();
      }
   });

})();