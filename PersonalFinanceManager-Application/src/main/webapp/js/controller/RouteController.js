/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */

define([
        'LoggerConfig', 
        'Mediator',
        'Sammy' 
        ], 
        function(LoggerConfig, Mediator, Sammy) {

     var instance;

     function init(){
    	 var router = new Sammy(), logger = new LoggerConfig().getLogger('RouteController.js');
    	 
    	 router.notFound = function(verb, path) {
             logger.debug("Route not found", verb, path);
         };
    	 
         return {
             router : router
         };
     }
     
     return (function () {
         if (!instance) {
             instance = init();
         }
         return instance;
     }());
  
});