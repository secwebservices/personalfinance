/*jslint browser: true, devel: true, unparam: true, evil: true */

define([ 'modules/knockout/build/output/knockout-latest',
         'core/config/LoggerConfig'
         ], function(ko, 
                 LoggerConfig) {
    
    var App = {
            "logger": undefined,
            "uiTheme": ko.observable("start"),
            "uiThemes": uiThemes,
            "load" : function(){
                // Load Configuration form LocalStorage
                var store = localStorage.PersonalFinanceManager_store, template, vm, box,
                themeStore = localStorage.PersonalFinanceManager_theme;

                if(themeStore){
                    App.uiTheme(themeStore);
                }
            }            
        };
    
        (function () {
            App.logger = new LoggerConfig().getLogger('app.js');
            // Apply bindings
            ko.applyBindings(App, document.getElementById("htmlTop"));
            
            App.uiTheme.subscribe(function(value){
                localStorage.PersonalFinance_theme = value;
            });
            
            App.load();
        }());   
        
        $.extend(window, {
            PFApp: App
        });
        
        return App;
});