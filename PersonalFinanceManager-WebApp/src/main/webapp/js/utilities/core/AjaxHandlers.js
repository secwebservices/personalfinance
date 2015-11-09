/*jslint browser: true, devel: true */
define(['jquery',
        'knockoutjs',
        'LoggerConfig',
        'Mediator'], function ($, ko, LoggerConfig, Mediator) {
    'use strict';
    
    var instance;
    function init() {
    	
    	var logger, loadingOverlay, loadingTimer, saveOverlay, 
        loadingOverlays = 0, savingOverlays = 0, 
        loadingModel = {loadingCount : ko.observable(loadingOverlays)}, 
        savingModel = {savingCount : ko.observable(savingOverlays)};

        logger = new LoggerConfig().getLogger("AjaxHandlers.js");
        logger.info("Initializing Ajax Handlers");
    	
    	function registerAjaxListeners() {
            $(document).ajaxSend(function(event, jqxhr, settings ){
                logger.debug("AJAX", settings.type,  "call to server:", settings.url);
                
                if(settings.url.indexOf('loading.htm') < 0 && settings.url.indexOf('saving.htm') < 0){
                    if(settings.url.indexOf('save') > 0){
                        Mediator.publish({"channel" : "show-saving"});
                    }else{
                        Mediator.publish({"channel" : "show-loading"});   
                    }
                }
                
                if(!settings.async){
                    setTimeout(function(){
                        return true;
                    }, 300);
                }else{
                    return true;
                }
                
            });
            
            $(document).ajaxComplete(function(event, xhr, settings){
                logger.debug("AJAX", settings.type, settings.url, "call to server complete");
                
                if(settings.url.indexOf('loading.htm') < 0 && settings.url.indexOf('saving.htm') < 0){
                    if(settings.url.indexOf('save') > 0){
                        Mediator.publish({"channel" : "hide-saving"});
                    }else{
                        Mediator.publish({"channel" : "hide-loading"});                    
                    }                    
                }
            }); 
            
            
            $(document).ajaxSuccess(function(event, xhr, settings) {
                logger.debug('AJAX', settings.type, settings.url, xhr.status, xhr.statusText, settings.dataType);
            });
            
            $(document).ajaxError(function(event, xhr, settings, exception) {
                logger.debug('AJAX', settings.type, settings.url, xhr.status, xhr.statusText, settings.dataType, exception);  
            });               
        }    	
    	
        Mediator.subscribe({
            "channel": "show-loading",
            "context": self,
            "callback": function(){
                if(!loadingOverlay){
                    loadingOverlay = $(TemplateManager.getTemplate('loading'));
                    $('body').prepend(loadingOverlay);
                    ko.applyBindings(loadingModel, loadingOverlay[0]);
                }

                loadingOverlays++;
                loadingModel.loadingCount(loadingOverlays);
                if(!$(loadingOverlay).is(':visible')){
                    $(loadingOverlay).fadeIn(250);
                    if(!$("body").hasClass('wait')){
                        $("body").addClass("wait");
                    } 
                }                  
            }
        });
        Mediator.subscribe({
            "channel": "hide-loading",
            "context": self,
            "callback": function(){
                if(loadingOverlay){
                    loadingOverlays--;
                    
                    if(loadingOverlays < 1){
                        loadingOverlays = 0;
                        $(loadingOverlay).fadeOut(500, function(){
                            if($("body").hasClass('wait')){
                                $("body").removeClass("wait");  
                            }                                
                        });
                    }else{
                        loadingModel.loadingCount(loadingOverlays);
                    }
                }                  
            }
        });             
        Mediator.subscribe({
            "channel": "show-saving",
            "context": self,
            "callback": function(){
                if(!saveOverlay){
                    saveOverlay = $(TemplateManager.getTemplate('saving'));
                    $('body').prepend(saveOverlay);
                    ko.applyBindings(savingModel, saveOverlay[0]);
                }

                savingOverlays++;
                savingModel.savingCount(savingOverlays);
                
                if(!$(saveOverlay).is(':visible')){
                    $(saveOverlay).fadeIn(250);
                }                    
            }
        });
        Mediator.subscribe({
            "channel": "hide-saving",
            "context": self,
            "callback": function(){
                setTimeout(function(){
                    if(saveOverlay){
                        savingOverlays--;
                        
                        if(savingOverlays < 1){
                            savingOverlays = 0;
                            $(saveOverlay).fadeOut(500);
                        }else{
                            savingModel.savingCount(savingOverlays);
                        }
                    }                          
                }, 1);
              
            }
        });  
        
        return {
            "registerAjaxListeners": registerAjaxListeners
        }; 
    }
    
    return (function () {
        if (!instance) {
            instance = init();
            instance.registerAjaxListeners();
        }
        return instance;
    }());  
            
            
});