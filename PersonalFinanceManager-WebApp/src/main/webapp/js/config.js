/*jslint browser: true, devel: true, unparam: true, evil: true, laxbreak: true */

/**
 * @author Robert “The Man” Suppenbach
 * @note 
 *      DERIVED FILE
 *      ONLY MODIFY THE VERSION OF THIS FILE IN THE /src/main/resources folder.
 */
define(['jquery', 'LoggerConfig'], function($, LoggerConfig){
    var logger = new LoggerConfig().getLogger('globals.js'),
    config = {
        uiThemes: [{label:"Black Tie", value:"black-tie"},
                   {label:"Blitzer", value:"blitzer"},
                   {label:"Cupertino", value:"cupertino"},
                   {label:"Dark Hive", value:"dark-hive"},
                   {label:"Excite Bike", value:"excite-bike"},
                   {label:"Flick", value:"flick"},
                   {label:"Hot Sneaks", value:"hot-sneaks"},
                   {label:"Humanity", value:"humanity"},
                   {label:"Mint Chocolate", value:"mint-choc"},
                   {label:"Overcast", value:"overcast"},
                   {label:"Pepper Grinder", value:"pepper-grinder"},
                   {label:"Redmond", value:"redmond"},
                   {label:"Smoothness", value:"smoothness"},
                   {label:"Start", value:"start"},
                   {label:"Trontastic", value:"trontastic"},
                   {label:"Vader", value:"vader"}],
       sessionTimeOutTime: (1000 * 60 * 5),
       build: "20151113",
       version: "1.0.1",
       environment: "local"
    };
    
    // overrides for local env incremental builds
    if(config.build.indexOf("buildId") > 0){
        var today = new Date();
        config.build = today.getFullYear() + "" + today.getDate() + "" + today.getDay();
    }
    if(config.version.indexOf("versionId") > 0){
        config.version = "Local";
    }
    if(config.environment.indexOf("enviromentId") > 0){
        config.environment = "DEV";
    }
    
    // make the configuration globally available.
    $.extend(window, config);
        
    return config;
});