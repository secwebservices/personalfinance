/*jslint browser: true, devel: true, unparam: true, evil: true, laxbreak: true */

/**
 * @author Robert “The Man” Suppenbach
 */
define(['knockoutjs', 'LoggerConfig', 'jquery', 'jquery-ui'], function(ko, LoggerConfig, $) {
    var logger = new LoggerConfig().getLogger('KnockoutExtensions.js');
    
    ko.extenders.numeric = function(target, precision) {
        // create a writeable computed observable to intercept writes to our observable
        var result = ko
                .computed(
                        {
                            read : target, // always return the original observables value
                            write : function(newValue) {
                                var current = target(), roundingMultiplier = Math.pow(10, precision), newValueAsNum = isNaN(newValue) ? 0
                                        : parseFloat(+newValue), valueToWrite = Math.round(newValueAsNum
                                        * roundingMultiplier)
                                        / roundingMultiplier;
                                if ( valueToWrite !== newValue && newValue === null ) {
                                    valueToWrite = null;
                                }
                                // only write if it changed
                                if ( valueToWrite !== current ) {
                                    target(valueToWrite);
                                } else {
                                    // if the rounded value is the same, but a different value was written,
                                    // force a notification for the current field
                                    if ( newValue !== current ) {
                                        target.notifySubscribers(valueToWrite);
                                    }
                                }
                            }
                        }).extend({
                    notify : 'always'
                });

        // initialize with current value to make sure it is rounded appropriately
        result(target());

        // return the new computed observable
        return result;
    };

});