/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define([ 
        'knockoutjs',
        'LoggerConfig',
        'Mediator'], 
        function(ko, LoggerConfig, Mediator) {

    /**
     * @constructor
     */
    function DashboardView(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('DashboardView.js'); 

        self.initialize(config);
    }
    
    /**
     * @param logger {object}
     */
    DashboardView.prototype.logger = undefined;
    /**
     * @param element {object}
     */
    DashboardView.prototype.element = undefined;
    /**
     * @param template {object}
     */
    DashboardView.prototype.templateManager = undefined;
    
    DashboardView.prototype.template = 'dashboard';
    
    DashboardView.prototype.rendered = false;
    
    DashboardView.prototype.applicationContext = undefined;

    DashboardView.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('DashboardView Initialize');
        
        for (c in options) {
            if (options.hasOwnProperty(c) && typeof self[c] === 'function') {
                self[c](options[c]);
            }else if (options.hasOwnProperty(c)){
                self[c] = options[c];
            }
        }
        
        Mediator.subscribe({
        	channel:'PF-Render', 
        	callback: function(message){
        		if(message.view === 'DashboardView'){
        			self.render(); 
        		}else if(self.rendered && message.derender){
        			self.derender();
        		}
        	},
        	context: self
    	});
        
        Mediator.subscribe({
        	channel:'PF-Derender', 
        	callback: function(message){
        		if(message.view === 'DashboardView' && self.rendered){
        			self.derender();
        		}
        	},
        	context: self
    	});          
    };
    
    /**
     * render the view
     * 
     * @returns {object}
     */
    DashboardView.prototype.render = function() {
        var self = this, $el, templateData;

        self.logger.debug("DashboardView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = self.templateManager.getTemplate(self.template);
            
            $el.html(templateData);

            ko.cleanNode($el[0]);
            ko.applyBindings(self.applicationContext, $el[0]);
            
            self.rendered = true;            
        } catch (e) {
            self.logger.error('DashboardView.prototype.render', e);
        }

    };
    
    DashboardView.prototype.derender = function() {
        var self = this, $el;

        self.logger.debug("DashboardView.prototype.derender");
        
        try {
            $el = $(self.element);
            self.templateManager.clearTemplate(self.template);
            ko.cleanNode($el[0]);
            
            self.rendered = false;
        } catch (e) {
            self.logger.error('DashboardView.prototype.derender', e);
        }        
    };

    // Return the function
    return DashboardView;

});