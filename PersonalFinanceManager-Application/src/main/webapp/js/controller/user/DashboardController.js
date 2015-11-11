/* jslint browser: true, devel: true, unparam: true, eval: true */

/**
 * @author Robert “The Man” Suppenbach
 */

define(['jquery',
        'knockoutjs', 
        'LoggerConfig', 
        'Mediator',
        'view/IndexView',
        'view/DashboardView',
        'controller/RouteController'], function($, ko, LoggerConfig, Mediator, IndexView, DashboardView, RouteController){
	
    function DashboardController(config){
    	var self = this, indexView, dashboardView;
    	
    	self.logger = new LoggerConfig().getLogger('DashboardController.js');
    	
    	indexView = new IndexView({
            /** the element to render the view on. */
            element : '.viewpoint',
            templateManager : config.templateManager
        });

    	dashboardView = new DashboardView({
            /** the element to render the view on. */
            element : '.viewpoint',
            templateManager : config.templateManager,
            applicationContext: self.applicationContext
    	});
        
        self.initialize(config);
    }
    
    DashboardController.prototype.logger = undefined;
    
    DashboardController.prototype.applicationContext = undefined;
       
    DashboardController.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config), notFound;
        
        self.logger.info('DashboardController Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
    	
        RouteController.router.route('get', '#welcome', 
	    	function(){
				Mediator.publish({channel: 'PF-Render', view: 'IndexView', derender: true});	
	    	}
	    );

        RouteController.router.route('get', '#dashboard', 
	    	function(){
				Mediator.publish({channel: 'PF-Render', view: 'DashboardView', derender: true});	
	    	}
	    );
                      
    };
    
    return DashboardController;
    
});
    
    