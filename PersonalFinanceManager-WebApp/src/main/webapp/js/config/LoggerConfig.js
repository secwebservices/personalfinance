/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define([ "lib/log4javascript" ], function(log4javascript) {
    /**
     * @constructor
     * @param loglevel
     */
    function LoggerConfig(loglevel) {
        var self = this;
        
        if(loglevel === undefined){
            self.logLevel = log4javascript.Level.TRACE;
        }
        if(loglevel === 'TRACE'){
            self.logLevel = log4javascript.Level.TRACE;
        }
        if(loglevel === 'DEBUG'){
            self.logLevel = log4javascript.Level.DEBUG;
        }
        if(loglevel === 'INFO'){
            self.logLevel = log4javascript.Level.INFO;
        }            
        if(loglevel === 'WARN'){
            self.logLevel = log4javascript.Level.WARN;
        }    
        if(loglevel === 'ERROR'){
            self.logLevel = log4javascript.Level.ERROR;
        }   
        if(loglevel === 'FATAL'){
            self.logLevel = log4javascript.Level.FATAL;
        } 
        
        if(!window.logappenders){
			self.setup();         
        }
    }

    LoggerConfig.prototype.logLevel = undefined;
    
    LoggerConfig.prototype.name = 'PersonalFinance';

    /**
     * setup
     * Sets up the log appenders and layouts
     */
    LoggerConfig.prototype.setup = function() {
        var self = this, appenders = {}, layout = {};

        layout.standard = new log4javascript.PatternLayout("%r [%p] - %d{HH:mm:ss} \t %c \t %m");
        
        appenders.browserConsoleAppender = new log4javascript.BrowserConsoleAppender();
        appenders.browserConsoleAppender.setLayout(layout.standard);
        appenders.browserConsoleAppender.setThreshold(self.logLevel);

        appenders.warnBrowserConsoleAppender = new log4javascript.BrowserConsoleAppender();
        appenders.warnBrowserConsoleAppender.setLayout(new log4javascript.NullLayout());
        appenders.warnBrowserConsoleAppender.setThreshold(log4javascript.Level.WARN);
        
        appenders.alertAppender = new log4javascript.AlertAppender();
        appenders.alertAppender.setLayout(layout.standard);
        appenders.alertAppender.setThreshold(log4javascript.Level.FATAL);
        
        window.logappenders = appenders;
    };
    /**
     * getLogger
     * 
     * @param {log4javascript}
     * @returns {object}
     */
    LoggerConfig.prototype.getLogger = function(name) {
        var self = this, logger;

        if (typeof name !== 'undefined') {
            self.name = name;
        }

        /**
         * setup the log4javascript logger
         */
        logger = log4javascript.getLogger(self.name);

        logger.addAppender(window.logappenders.browserConsoleAppender);   
        logger.addAppender(window.logappenders.warnBrowserConsoleAppender);
        logger.addAppender(window.logappenders.alertAppender);

        return logger;
    };

    // Return the function
    return LoggerConfig;
});