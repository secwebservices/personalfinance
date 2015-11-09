/*global define, $*/

/**
 * @author Robert “The Man” Suppenbach
 */
define(['core/config/LoggerConfig'], function (LoggerConfig) {
    'use strict';
    var instance;
    function init() {
        var channels = {}, logger;
        logger = new LoggerConfig().getLogger('Mediator.js');
        function GUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.floor(Math.random() * 16), v = c === 'x' ? r : (r % 4) + 8;
                return v.toString(16);
            });
        }
        function Subscription(options) {
            this.id = GUID();
            this.channel = options.channel;
            this.callback = options.callback;
            if (options.context) {
                this.context = options.context;
            } else {
                this.context = false;
            }
            if (options.count) {
                this.count = options.count;
            }
        }
        function Message(options) {
            var i;
            this.id = GUID();
            this.propagationStopped = false;
            try {
                for ( i in options ) {
                    if ( options.hasOwnProperty(i) ) {
                        this[i] = options[i];
                    }
                }
            } catch (e) {
                logger.error(e);
            }
        }
        Message.prototype.stopPropagation = function () {
            this.propagationStopped = true;
        };
        function error() {
            var args = arguments;
            if (logger !== undefined) {
                logger.error.apply(logger, args);
            } else if (console !== undefined && console.error !== undefined) {
                console.error.call(args);
            }
        }
        function find(filter) {
            var subs = [], c, s, f, match;
            if (filter) {
                for (c in channels) {
                    if (channels.hasOwnProperty(c)) {
                        for (s = 0; s < channels[c].length; s += 1) {
                            match = true;
                            if (filter instanceof Subscription) {
                                if (channels[c][s] !== filter) {
                                    match = false;
                                }
                            } else {
                                for (f in filter) {
                                    if (filter.hasOwnProperty(f)) {
                                        if (channels[c][s].hasOwnProperty(f)) {
                                            if (channels[c][s][f] !== filter[f]) {
                                                match = false;
                                                break;
                                            }
                                        } else {
                                            match = false;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (match) {
                                subs.push(channels[c][s]);
                            }
                        }
                    }
                }
            }
            return subs;
        }
        function subscribe(options) {
            var sub = false;
            if (typeof options.channel === 'string' && typeof options.callback === 'function') {
                if (find({"channel": options.channel, "callback": options.callback}).length === 0) {
                    sub = new Subscription(options);
                    if (channels[sub.channel] === undefined) {
                        channels[sub.channel] = [];
                    }
                    channels[sub.channel].push(sub);
                }
            }
            return sub;
        }
        function unsubscribe(options) {
            var ret = false, subs = find(options), s, i;
            if (subs.length) {
                for (s = 0; s < subs.length; s += 1) {
                    i = channels[subs[s].channel].indexOf(subs[s]);
                    channels[subs[s].channel].splice(i, 1);
                    ret = true;
                    if (channels[subs[s].channel].length === 0) {
                        delete channels[subs[s].channel];
                    }
                }
            }
            return ret;
        }
        function publish(options) {
            var ret = false, message, subs, expired = [], s;
            
            
            if (typeof options.channel === 'string' && options.propagationStopped === undefined && options.stopPropagation === undefined && options.set === undefined) {
                subs = find({"channel": options.channel});
                if (subs.length > 0) {
                    ret = message = new Message(options);
                    for (s = 0; s < subs.length; s += 1) {
                        try {
                            subs[s].callback.apply(subs[s].context, [message]);
                        } catch (e) {
                            error("Mediator publish error for channel", options.channel, e.message, e.stack, e);
                        }
                        if (subs[s].count !== undefined) {
                            subs[s].count -= 1;
                            if (subs[s].count === 0) {
                                expired.push(subs[s]);
                            }
                        }
                        if (message.propagationStopped) {
                            break;
                        }
                    }
                    for (s = 0; s < expired.length; s += 1) {
                        unsubscribe(expired[s]);
                    }
                }
            }
            return ret;
        }
        return {
            "subscribe": subscribe,
            "unsubscribe": unsubscribe,
            "publish": publish
        };
    }
    return (function () {
        if (!instance) {
            instance = init();
        }
        return instance;
    }());
});