/*jslint browser: true, devel: true */

define(['model/IndexModel', 
        'knockoutjs',
        'LoggerConfig',
        'Mediator'], 
        function(IndexModel, ko, LoggerConfig, Mediator) {

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
    /**
     * @param template {object}
     */
    IndexView.prototype.templateManager = undefined;

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
            
            templateData = self.templateManager.getTemplate('Index');
            
            $el.html(templateData);

            indexModel = new IndexModel();

            ko.cleanNode($el[0]);
            ko.applyBindings(indexModel, $el[0]);

            Mediator.publish("PF-Ready", {});
        } catch (e) {
            self.logger.error('IndexView.prototype.render', e);
        }

    };

    // Return the function
    return IndexView;

});