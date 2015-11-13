/*jslint browser: true, devel: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['jquery'], function ($) {
    'use strict';
    
    var instance;
    function init() {
    	
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
    }
    
    return (function () {
        if (!instance) {
            instance = init();
        }
        return instance;
    }());  
            
            
});