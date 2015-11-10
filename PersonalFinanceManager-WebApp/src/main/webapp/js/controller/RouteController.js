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
    	 
    	 
    	 function addRoute(data){
    		 logger.debug(JSON.stringify(data));
    		 router.route(data.method, data.path, data.callback);
    	 }

    	 function removeRoute(data){
    		 //TODO get this working
    	 }
    	 
    	 
    	 router.run('#/');
    	 
         return {
             "addRoute": addRoute,
             "removeRoute": removeRoute
         };
     }
     
     return (function () {
         if (!instance) {
             instance = init();
         }
         return instance;
     }());
  
});