/*jslint browser: true, devel: true, unparam: true, evil: true, laxbreak: true */

define([ 'modules/knockout/build/output/knockout-latest', 'core/config/LoggerConfig'], function(ko, LoggerConfig) {
    var existingBindingProvider, logger = new LoggerConfig().getLogger('bindinghandlers.js');
    ko.bindingHandlers.selectedText = {
        init : function(element, valueAccessor, allBindings) {
            var value = valueAccessor(), options = allBindings().options;

            $(element).find('option').each(function(index, option) {
                if ( value() === option.value ) {
                    logger.info(value(), option.value);
                    $(element).prop('selected', true);
                }
            });

            $(element).change(function() {
                value($("option:selected", this).text());
            });
        }
    };

    ko.bindingHandlers.button = {
        init : function(element, valueAccessor) {
            var options = ko.utils.unwrapObservable(ko.toJS(valueAccessor())) || {};
            $(element).button(options);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).button("destroy");
            });
        },
        update : function(element, valueAccessor) {
            var options = ko.toJS(valueAccessor());

            if ( options ) {
                $(element).button(options);
            }
        }
    };

    /**
     * combobox jQuery UI combobox binding modified version of the autocomplete widget from jQuery UI
     */
    ko.bindingHandlers.combobox = {
        init : function(element, valueAccessor) {
            var options = ko.utils.unwrapObservable(ko.toJS(valueAccessor())) || {};
            setTimeout(function() {
                $(element).combobox(options);
                $(element).removeClass("ui-widget");
            }, 1);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).combobox("destroy");
            });
        },
        update : function(element, valueAccessor) {
            var options = ko.toJS(valueAccessor());

            if ( options ) {
                $(element).combobox(options);
                $(element).removeClass("ui-widget");
            }
        }
    };
    ko.bindingHandlers.spinner = {
        update : function(element, valueAccessor, allBindings) {
            var options = ko.utils.unwrapObservable(ko.toJS(valueAccessor())) || {};

            $.extend(options, {
                change : function(event, ui) {
                    allBindings().value($(element).val());
                }
            });

            $(element).bind('focus', function() {
                $(element).spinner(options);
            });

            $(element).bind('blur', function() {
                $(element).spinner("destroy");
            });
        }
    };

    /**
     * tabsFromFieldsets
     * 
     * converts a form with fieldsets into a tabs container. supports updates to the tabs via a resetTabs
     * trigger example $(document).trigger('resetTabs');
     * 
     * usage <form data-bind="tabsFromFieldsets : { tabs options }" > .... </form>
     */
    ko.bindingHandlers.tabsFromFieldsets = {
        init : function(element, valueAccessor, allBindingsAccessor) {
            var config = valueAccessor() || {
                selected : ko.observable(0)
            }, tabList, index, fieldName;

            logger.info(JSON.stringify(config, null, 2));

            $(element).hide();
            fieldName = $(element).attr('name');
            tabList = $('<ul id="tabsList"></ul>');
            $(element).prepend(tabList);

            $(element).tabs(config);

            $(document).on(
                    'resetTabs',
                    function() {
                        index = 0;
                        $(element).children('fieldset').each(
                                function(idx, fieldset) {
                                    if ( !$(fieldset).hasClass('tabContent') ) {
                                        $(fieldset).attr('id', 'tab_' + fieldName + '_' + index).addClass(
                                                'tabContent');

                                        $(tabList).append(
                                                '<li><a href="#tab_' + fieldName + '_' + index++ + '">'
                                                        + $(fieldset).find("legend").html() + '</a></li>');

                                        $(fieldset).find("legend").remove();
                                    } else {
                                        index++;
                                    }
                                });

                        setTimeout(function() {
                            try {
                                $(element).tabs("refresh");

                                if ( config.selected !== null ) {
                                    $(element).tabs("option", "active", config.selected());
                                }
                            } catch (e) {
                                logger.error(e.message);
                            }

                        }, 1);
                    });

            setTimeout(function() {
                $(document).trigger('resetTabs');
                $(element).fadeIn(500);
            }, 1);
        }
    };

    ko.bindingHandlers.accordion = {
        init : function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var options = ko.utils.unwrapObservable(ko.toJS(valueAccessor())) || {}, watchFunc, watched = [], w, watchers = [], watchIt;
            ko.applyBindingsToDescendants(bindingContext, element);
            watchIt = allBindingsAccessor.get('watchIt') || false;
            if ( watchIt ) {
                if ( Object.prototype.toString.call(watchIt) === "[object Array]" ) {
                    watchers = watchIt;
                } else {
                    watchers.push(watchIt);
                }
                watchFunc = function() {
                    setTimeout(function() {
                        var active = options.active || false;
                        console.debug("Reapplying accordion binding based on watchIt");
                        if ( !!$(element).data("ui-accordion") ) {
                            active = $(element).accordion('active');
                        }
                        $(element).accordion(options).accordion('active', active);
                    }, 1);
                };
                for ( w = 0; w < watchers.length; w += 1 ) {
                    watched.push(watchers[w].subscribe(watchFunc));
                }
            }
            setTimeout(function() {
                $(element).accordion(options);
            }, 1);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).accordion("destroy");
                if ( watched.length > 0 ) {
                    for ( w = 0; w < watched.length; w += 1 ) {
                        watched[w].dispose();
                    }
                    watched = [];
                }
                return [
                    allBindingsAccessor, viewModel
                ];
            });
            return {
                "controlsDescendantBindings" : true
            };
        },
        update : function(element, valueAccessor) {
            var options = ko.toJS(valueAccessor());

            if ( options ) {
                setTimeout(function() {
                    $(element).accordion(options);
                }, 1);
            }
        }
    };

    ko.bindingHandlers.fileUpload = {
        init : function(element, valueAccessor, allBindingsAccessor) {
            var fileInput = valueAccessor(), allBindings = allBindingsAccessor(), files = [
                ko.utils.unwrapObservable(ko.toJS(fileInput))
            ];

            $(element).hide();
            $('.progress').hide();
            $('.uploadStatus').hide();

            $(element).fileupload({
                dataType : 'json',

                done : function(e, data) {
                    var lastUploaded = data.result.pop();
                    logger.info(lastUploaded);
                    fileInput(lastUploaded.fileName);
                    $('.progress').progressbar('destroy');
                    $('.progress').hide();
                    $('.uploadStatus').hide();
                },
                add : function(e, data) {
                    $('.progress').show();
                    $('.uploadStatus').show();
                    $('.uploadStatus').html("Uploading...");
                    $('.progress').progressbar();
                    data.submit();
                },

                progress : function(e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    logger.info(progress);
                    $('.progress').progressbar("option", "value", progress);

                    if ( progress === 100 ) {
                        $('.uploadStatus').html("Upload Complete - Processing...");
                    } else {
                        $('.uploadStatus').html("Uploading... " + progress + "%");
                    }
                },
                progressInterval : 50,
                formData : {
                    path : allBindings.path || ''
                },

                dropZone : $('.dropzone')
            });

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).fileupload("destroy");
            });
        }
    };

    ko.bindingHandlers.sortableGroups = {
        "init" : function(element, valueAccessor, allBindingsAccessor) {
            var setup, config = valueAccessor(), allBindings, value, sub;
            function disposal() {
                sub.dispose();
                $(element).sortable("destroy");

            }
            function update() {
                setTimeout(function() {
                    $(element).sortable("destroy");
                    setup();
                }, 1);
            }
            setup = function() {
                try {
                    $(element).sortable({
                        "handle" : ".ui-accordion-header",
                        "placeholder" : "ui-state-highlight",
                        "forcePlaceholderSize" : true
                    }).bind(
                            'sortupdate',
                            function(event, ui) {
                                setTimeout(function() {
                                    var order = [];
                                    if ( $(element).find(ui) ) {
                                        $(element).children('.ui-accordion').each(
                                                function(x, el) {
                                                    logger.info("Adding data-sortname to order listing");
                                                    order.push($(el).find('.ui-accordion-header').first().attr(
                                                            'data-sortname'));
                                                });
                                        console.debug("Identified sort order", order);
                                        $(element).children('.ui-accordion').each(function(el) {
                                            ko.utils.domNodeDisposal.removeDisposeCallback(el, update);
                                        });
                                        setTimeout(function() {
                                            value.sort(function(a, b) {
                                                var ret = 1;
                                                if ( order.indexOf(a.name()) < 0 ) {
                                                    console.warn("Could not find index of element name:", a
                                                            .name());
                                                }
                                                if ( order.indexOf(b.name()) < 0 ) {
                                                    console.warn("Could not find index of element name:", b
                                                            .name());
                                                }
                                                if ( order.indexOf(a.name()) < order.indexOf(b.name()) ) {
                                                    ret = -1;
                                                }
                                                return ret;
                                            });
                                            App.update();
                                        }, 1);
                                    }
                                }, 1);
                            });
                    $(element).children('.ui-accordion').each(function(el) {
                        ko.utils.domNodeDisposal.addDisposeCallback(el, update);
                    });
                } catch (e) {
                    console.error("Error in sortableEntries", e.message, e.stack, e);
                }
            };
            if ( config ) {
                allBindings = allBindingsAccessor();
                value = allBindings.foreach || allBindings.template.foreach;
                if ( value ) {
                    sub = value.subscribe(update);
                    ko.utils.domNodeDisposal.addDisposeCallback(element, disposal);
                    setup();
                }
            }
        }
    };

    ko.bindingHandlers.sortableDataPoints = {
        "init" : function(element, valueAccessor, allBindingsAccessor) {
            var setup, config = valueAccessor(), allBindings, value, sub;
            function disposal() {
                sub.dispose();
                $(element).sortable("destroy");

            }
            function update() {
                setTimeout(function() {
                    $(element).sortable("destroy");
                    setup();
                }, 1);
            }
            setup = function() {
                try {
                    $(element).sortable({
                        "handle" : ".ui-accordion-header",
                        "placeholder" : "ui-state-highlight",
                        "forcePlaceholderSize" : true
                    }).bind(
                            'sortupdate',
                            function(event, ui) {
                                setTimeout(function() {
                                    var order = [];
                                    if ( $(element).find(ui) ) {
                                        $(element).children('.ui-accordion').each(
                                                function(x, el) {
                                                    logger.info("Adding data-sortname to order listing");
                                                    order.push($(el).find('.ui-accordion-header').first().attr(
                                                            'data-sortname'));
                                                });
                                        console.debug("Identified sort order", order);
                                        $(element).children('.ui-accordion').each(function(el) {
                                            ko.utils.domNodeDisposal.removeDisposeCallback(el, update);
                                        });
                                        setTimeout(function() {
                                            value.sort(function(a, b) {
                                                var ret = 1;
                                                if ( order.indexOf(a.cellReference()) < 0 ) {
                                                    console.warn("Could not find index of element name:", a
                                                            .cellReference());
                                                }
                                                if ( order.indexOf(b.cellReference()) < 0 ) {
                                                    console.warn("Could not find index of element name:", b
                                                            .cellReference());
                                                }
                                                if ( order.indexOf(a.cellReference()) < order.indexOf(b
                                                        .cellReference()) ) {
                                                    ret = -1;
                                                }
                                                return ret;
                                            });
                                            App.update();
                                        }, 1);
                                    }
                                }, 1);
                            });
                    $(element).children('.ui-accordion').each(function(el) {
                        ko.utils.domNodeDisposal.addDisposeCallback(el, update);
                    });
                } catch (e) {
                    console.error("Error in sortableEntries", e.message, e.stack, e);
                }
            };
            if ( config ) {
                allBindings = allBindingsAccessor();
                value = allBindings.foreach || allBindings.template.foreach;
                if ( value ) {
                    sub = value.subscribe(update);
                    ko.utils.domNodeDisposal.addDisposeCallback(element, disposal);
                    setup();
                }
            }
        }
    };

    ko.bindingHandlers.foreachprop = {
        transformObject : function(obj) {
            var key, properties = [];
            for ( key in obj ) {
                if ( obj.hasOwnProperty(key) ) {
                    properties.push({
                        key : key,
                        value : obj[key]
                    });
                }
            }
            return properties;
        },
        init : function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var sub, value = ko.utils.unwrapObservable(valueAccessor()), properties = ko
                    .observableArray(ko.bindingHandlers.foreachprop.transformObject(value));
            function update() {
                try {
                    value = ko.utils.unwrapObservable(valueAccessor());
                    properties(ko.bindingHandlers.foreachprop.transformObject(value));
                } catch (e) {
                    console.error("Error in foreachprop binding", e.message, e.stack, e);
                }
            }
            ko.applyBindingsToNode(element, {
                foreach : properties
            }, bindingContext);
            try {
                sub = valueAccessor().subscribe(update);
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    sub.dispose();
                });
            } catch (e) {
                console.error("Error in foreachprop binding", e.message, e.stack, e);
            }
            return {
                controlsDescendantBindings : true
            };
        }
    };

    ko.bindingHandlers.menu = {
        init : function(element, valueAccessor) {
            var options = ko.utils.unwrapObservable(ko.toJS(valueAccessor())) || {};
            setTimeout(function() {
                $(element).menu(options);
            }, 1);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).menu("destroy");
            });
        },
        update : function(element, valueAccessor) {
            setTimeout(function() {
                $(element).menu("option", "value", valueAccessor());
            }, 1);
        }
    };

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

    existingBindingProvider = ko.bindingProvider.instance;

    /**
     * bindingProvider Logs binding errors
     */
    ko.bindingProvider.instance = {
        nodeHasBindings : existingBindingProvider.nodeHasBindings,
        getBindings : function(node, bindingContext) {
            var bindings;
            try {
                bindings = existingBindingProvider.getBindings(node, bindingContext);
            } catch (ex) {
                logger.info("Binding Error", node, ex.message, ex.stack);
            }

            return bindings;
        }
    };

});