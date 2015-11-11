/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['model/IndexModel', 
        'knockoutjs',
        'LoggerConfig',
        'Mediator',
        'TemplateManager'], 
        function(IndexModel, ko, LoggerConfig, Mediator, TemplateManager) {

    /**
     * @constructor
     */
    function IndexView(config) {
    	var self = this;
    	self.logger = new LoggerConfig().getLogger('IndexView.js'); 

        self.initialize(config);
    }
    
    /**
     * @param logger {object}
     */
    IndexView.prototype.logger = undefined;
    /**
     * @param element {object}
     */
    IndexView.prototype.element = undefined;
    
    IndexView.prototype.template = 'Index';
    
    IndexView.prototype.rendered = false;

    IndexView.prototype.initialize = function (config) {
        var self = this, c, options = $.extend({}, config);
        
        self.logger.info('IndexView Initialize');
        
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
        		if(message.view === 'IndexView'){
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
        		if(message.view === 'IndexView' && self.rendered){
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
    IndexView.prototype.render = function() {
        var self = this, indexModel, $el, templateData;

        self.logger.debug("IndexView.prototype.render");

        try {
            $el = $(self.element);
            
            templateData = TemplateManager.getTemplate(self.template);
            
            $el.html(templateData);

            indexModel = new IndexModel();

            ko.cleanNode($el[0]);
            ko.applyBindings(indexModel, $el[0]);
            
            self.rendered = true;            
        } catch (e) {
            self.logger.error('IndexView.prototype.render', e);
        }

    };
    
    IndexView.prototype.derender = function() {
        var self = this, $el;

        self.logger.debug("IndexView.prototype.derender");
        
        try {
            $el = $(self.element);
            TemplateManager.clearTemplate(self.template);
            ko.cleanNode($el[0]);
            
            self.rendered = false;
        } catch (e) {
            self.logger.error('IndexView.prototype.derender', e);
        }        
    };

    // Return the function
    return IndexView;

});