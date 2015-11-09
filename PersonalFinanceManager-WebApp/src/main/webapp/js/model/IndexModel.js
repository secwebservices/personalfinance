/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['LoggerConfig',
        'Mediator'], function(LoggerConfig, Mediator) {

    /**
     * @constructor
     */
    function IndexModel(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('IndexModel.js'); 
    	
    	if(config){
        	self.initialize(config);    		
    	}
    }

    IndexModel.prototype.logger = undefined;

    IndexModel.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('IndexModel Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
    };
    
    // Return the function
    return IndexModel;
});