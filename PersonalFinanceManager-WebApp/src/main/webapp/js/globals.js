define(['modules/knockout/build/output/knockout-latest', 'core/config/LoggerConfig'], function(ko, LoggerConfig){
    var logger = new LoggerConfig().getLogger('globals.js'),
    Globals = {
        uiThemes: [
                   {label:"Black Tie", value:"black-tie"},
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
    };
    
    $.extend(window, Globals);
    
    Array.prototype.contains = function(elem) {
        var i;

        if ( $.isArray(this) ) {
            if ( $.inArray(elem, this) > -1 ) {
                return true;
            }
        }
        for ( i in this ) {
            if ( $.isArray(this[i]) ) {
                if ( $.inArray(elem, this[i]) > -1 ) {
                    return true;
                }
            }
        }

        return false;
    };

    window.onbeforeunload = function(e) {
        return 'Really....';
    }; 
    
    return Globals;
});