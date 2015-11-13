/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['LoggerConfig'], function(LoggerConfig) {

    /**
     * @constructor
     */
    function ErrorModel(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('ErrorModel.js'); 
    	
    	if(config){
        	self.initialize(config);    		
    	}
    }

    ErrorModel.prototype.error = undefined;
    
    ErrorModel.prototype.timeout = true;

    ErrorModel.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.debug("Error Data: ", JSON.stringify(config));
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }

    };
    
    // Return the function
    return ErrorModel;
});