// A CasperJS script to push and pull Google Search Appliance (GSA)
// configurations.  Written at Red Hat.
// 
// Copyright (C) 2013 Red Hat
// 
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program; if not, see <http://www.gnu.org/licenses/>.

(function () {

    // Les Variables!

    var system = require('system');

    var arg_start_index;
    var args = system.args;

    var casper = require('casper').create({
        clientScripts : [ 'jquery.min.js' ],
        waitTimeout   : 60000, // ms
        logLevel      : 'info', // info, debug, warning, or error
        verbose       : args.indexOf('-v') >= 0
    });

    var actions;
    var action_sequences;

    var GSA_PASSWORD = '';
    var GSA_USERNAME = '';
    var GSA_URL = '';

    //=======================
    //
    // Convenience functions
    //
    //=======================

    // Extract function name from a function reference
    // thanks http://stackoverflow.com/a/15714445/215148
    function functionName(fun) {
        var ret = fun.toString();
        ret = ret.substr('function '.length);
        ret = ret.substr(0, ret.indexOf('('));
        return ret;
    }

    function exit(returnValue) {
        casper.exit(returnValue);
    }

    // Find the index of the "gsa.js" command-line argument, so we'll know
    // where to find the arguments that are specific to gsa.js.  Since this
    // runs in CasperJS which runs in PhantomJS, there are a lot of CLI args
    // specific to those programs.
    function getArgStartIndex (args) {
        var args_i;
        for (args_i = 0; args_i < args.length; args_i += 1) {
            if (args[args_i].indexOf('gsa.js') >= 0) {
                return args_i;
            }
        }
        return -1;
    }

    //==========================================================================
    //
    // Common actions
    //
    // These are actions that need to be called by several sequences below.
    // Any action that needs to be called multiple times during a sequence, or
    // are used by multiple sequences, should go here.
    //
    //==========================================================================

    actions = {};

    actions.login = function login () {
        casper.start( GSA_URL, function () {
            this.fill('form[name=login]', {
                'userName' : GSA_USERNAME,
                'password' : GSA_PASSWORD
            }, true);
        });
    };

    actions.go_to_dyn_nav = function go_to_dyn_nav () {
        casper.thenOpen( GSA_URL + '?actionType=dynNav' );
    };

    actions.get_dnav_configurations = function get_dnav_configurations () {
        // for each configuration:
        //      click edit:
        //          get the Name
        //          get the Added Front Ends
        //          get Secure Search
        //          if Secure Search:
        //              get Use Fast Auth or Use All Auth
        //          get Use Only Fast Auth or Use All Types Auth
        //          for each Attribute:
        //              fn() get the Attribute's Label, Name, Type, [Range], SortBy, SortOrder

        casper.then(function () {

            // Wait for the page contents to be filled in via AJAX

            this.waitUntilVisible( "#gwt-debug-configAdd", function () {

                var configurations = "";

                casper.page.injectJs("dynamic_nav_data_types.js");

                configurations = this.evaluate(function () {

                    var configurations = [];
                    var $edit_buttons;

                    // Find the edit button for each Configuration
                    $edit_buttons = $("#gwt-debug-configs a.gwt-Anchor:contains(Edit)");
                    $edit_buttons.each(function () {

                        // Get a brand new Configuration object with default values
                        var configuration = DNAV_TYPES.clone( DNAV_TYPES.Configuration );

                        // view this Configuration
                        $(this).click();

                        // get the Name
                        configuration.name = $("#gwt-debug-configName").val();

                        // get the Added Front Ends
                        $("#gwt-debug-addedFes option").each(function () {
                            configuration.added_front_ends.push( $(this).val() );
                        });

                        // get Secure Search enabled
                        configuration.enable_secure_search =
                            $("#gwt-debug-enableSecureSearch-input").prop("checked");

                        // if Secure Search enabled, get the Auth Type
                        if (configuration.enable_secure_search) {
                            configuration.auth_type =
                                DNAV_TYPES.AuthzTypeValueToNameMap[
                                    $("[name=authzType]:checked").prop('id')
                                ];
                        }

                        // Click Edit on each Attribute and harvest their infos
                        $("#gwt-debug-params .gwt-Anchor:contains('Edit')").each(function () {

                            var attribute = DNAV_TYPES.clone( DNAV_TYPES.Attribute );

                            $(this).click();

                            attribute.display_label  = $('#gwt-debug-label').val();
                            attribute.attribute_name = $('#gwt-debug-name').val();
                            attribute.type           = DNAV_TYPES.AttributeTypeValueToNameMap[ $('#gwt-debug-type').val() ];
                            attribute.is_range       = $('#gwt-debug-isRange-input').prop("checked");
                            if (attribute.is_range) {
                                $("#gwt-debug-ranges option").each( function () {
                                    // ranges are in the format "1 - 10"
                                    var range_obj = DNAV_TYPES.clone( DNAV_TYPES.Range );
                                    var range     = $(this).val().split(" "); // split on spaces
                                    range.splice(1,1);                        // remove the "-" character
                                    range_obj.low  = range[0];
                                    range_obj.high = range[1];
                                    attribute.ranges.push( range_obj );
                                });
                            } else {
                                attribute.sort_by        = DNAV_TYPES.SortByValueToNameMap[ $("input[name=sortBy]:checked").prop("id") ];
                                attribute.sort_order     = DNAV_TYPES.SortOrderValueToNameMap[ $("input[name=sortOrder]:checked").prop("id") ];
                            }
                            attribute.is_entity = $("#gwt-debug-entity[aria-hidden=false] option:selected").length > 0;

                            configuration.attributes.push( attribute );

                        });

                        configurations.push( configuration );

                        // Go back to the list of Configurations
                        $("#gwt-debug-configCancel").click();

                    });
      
                    return JSON.stringify(configurations, null, 4 );

                });

                this.echo(configurations);
                //if (configurations !== "[]") {
                    //this.echo(configurations);
                //} else {
                    //run_actions( action_sequences[ args[arg_start_index+2] ] );
                //}

            });
        });
    };

    // Make the confirm() dialog return true every time, just like clicking Ok
    // automatically
    actions.always_confirm = function always_confirm () {
        casper.thenEvaluate(function () {
            var confirm2   = window.confirm;
            window.confirm = function (msg) { return true; };
        });
    };

    // Delete the first Dynamic Navigation configuration entry

    actions.delete_dnav_configuration = function delete_dnav_configuration () {

        casper.waitWhileVisible(

            ".gux-confirm-panel-message",

            function then () {
                this.thenEvaluate(function () {
                    // Click on the first Delete button
                    $("#gwt-debug-configs .gwt-Anchor:contains(Delete)").eq(0).click();
                });
            }
        );
    };

    // Delete all Dynamic Navigation configuration entries 

    actions.delete_dnav_configurations = function delete_dnav_configurations () {

        casper.waitForText( 
            "Existing Configurations",
            function then () {
                
                casper.then(function () {
                    var i;
                    var dnav_count = this.evaluate(function () {
                        return $("#gwt-debug-configs .gwt-Anchor:contains(Delete)").length;
                    });

                    for (i = 0; i < dnav_count; i += 1) {
                        actions.delete_dnav_configuration();
                    }
                });
            }
        );
    };

    actions.add_dnav_frontend = function add_dnav_frontend (fe) {
        casper.thenEvaluate(function (fe) {
            (function () {
                var $front_end = $("#gwt-debug-availableFes option[value="+fe+"]").detach();
                $("#gwt-debug-addedFes").append($front_end);
            }());
        }, fe);
    };

    actions.add_dnav_range = function add_dnav_range (range) {

        casper.waitUntilVisible(
            "#gwt-debug-addRange",
            function then() {
                this.evaluate(function (range) {
                        $("#gwt-debug-rangeLv").val( range.low );
                        $("#gwt-debug-rangeHv").val( range.high );
                }, range);
            }
        );

        casper.thenClick("#gwt-debug-addRange");
    };

    actions.add_dnav_attribute = function add_dnav_attribute (attribute) {

        casper.waitUntilVisible(
            "#gwt-debug-paramAdd",
            function then () {

                this.evaluate(function (attribute) {

                    var range_i;

                    // The only difference between Entity attributes and
                    // non-Entity attributes is that Entity attributes'
                    // "Attribute Names" come from a select list.
                    if (attribute.is_entity) {
                        $("#gwt-debug-entityAdd").click();
                        // select the Attribute Name from the select list
                        $("#gwt-debug-entity option[value="+
                            DNAV_TYPES.AttributeNameToValueMap[
                                attribute.attribute_name
                            ]+
                        "]").prop("selected", true);
                    } else {
                        $("#gwt-debug-paramAdd").click();
                        // Set the plaintext attribute name
                        $("#gwt-debug-name").val( attribute.attribute_name );
                    }

                    // The rest of these properties are common between both
                    // Entity attributes and non-entity attributes

                    // set display label
                    $("#gwt-debug-label").val( attribute.display_label );

                    // select the Type from the select list
                    if (attribute.type) {
                        $("#gwt-debug-type option[value="+
                            DNAV_TYPES.AttributeTypeNameToValueMap[
                                attribute.type
                            ]+
                        "]").prop("selected", true);
                    }

                    // Set SortBy and SortOrder
                    if (attribute.sort_by) {
                        $("#"+ DNAV_TYPES.SortByNameToValueMap[ attribute.sort_by ]).click();
                    }
                    if (attribute.sort_order) {
                        $("#"+ DNAV_TYPES.SortOrderNameToValueMap[ attribute.sort_order ]).click();
                    }


                }, attribute);

                // If this attribute has any ranges, add them
                if (attribute.is_range) {

                    this.thenClick("#gwt-debug-isRange-input");

                    for (range_i = 0; range_i < attribute.ranges.length; range_i += 1) {
                        actions.add_dnav_range( attribute.ranges[ range_i ] );
                    }
                }
            }
        );

        // Save attribute!
        casper.thenClick("#gwt-debug-paramCreate");

        casper.waitUntilVisible("#gwt-debug-paramAdd");

    };

    actions.add_dnav_configuration = function add_dnav_configuration (configuration) {

        casper.waitWhileVisible(

            ".gux-confirm-panel-message",

            function then () {

                casper.waitUntilVisible(

                    "#gwt-debug-configAdd",

                    function then () {

                        casper.page.injectJs("dynamic_nav_data_types.js");

                        casper.thenClick("#gwt-debug-configAdd");

                    }
                );
            }
        );

        // When the Create Configuration button appears, fill out the form
        casper.waitUntilVisible(

            "#gwt-debug-configCreate",

            function then() {

                var front_end_i;
                var attr_i;

                this.evaluate(function (configuration) {

                    $('#gwt-debug-configName').val( configuration.name );

                    if (configuration.enable_secure_search) {

                        // click Secure Search radio button
                        $("#gwt-debug-enableSecureSearch-input").prop("checked",configuration.enable_secure_search);

                        if (configuration.auth_type) {

                            // click Secure Search type
                            $("#"+ DNAV_TYPES.AuthzTypeNameToValueMap[ configuration.auth_type ] ).prop("checked",true);

                        }
                    }

                }, configuration);

                // Move each chosen front end from the Available to the Added column
                if (configuration.added_front_ends) {
                    for (front_end_i = 0; front_end_i < configuration.added_front_ends.length; front_end_i += 1) {
                        actions.add_dnav_frontend( configuration.added_front_ends[front_end_i] );
                    }
                }

                if (configuration.attributes) {
                    for (attr_i = 0; attr_i < configuration.attributes.length; attr_i += 1) {
                        actions.add_dnav_attribute( configuration.attributes[attr_i] );
                    }
                }
            }
        );

        casper.then(function () {
            this.page.injectJs("dynamic_nav_data_types.js");
        });


        // Save configuration!
        casper.thenClick( "#gwt-debug-configCreate" );

        // Wait until the "Configuration successfully created" dialog disappears
        casper.waitWhileVisible( ".gux-confirm-panel-message" );

    };

    actions.add_dnav_configurations = function add_dnav_configurations () {

        // for each configuration passed in:
        //      click Add
        //      enter Name gwt-debug-configName
        //      for each Added Front End:
        //          click on the corresponding Available Front End
        //      if secure search:
        //          click secure search
        //          if fast auth: click fast
        //          if all auth: click all
        //      for each attribute:
        //          if entity:
        //              click Add Entity
        //              choose Attribute Name
        //          else not entity:
        //              click Add
        //              enter Attribute Name
        //          enter display label
        //          choose Type
        //          choose SortBy
        //          choose SortOrder
        //          click Ok
        //      click Create
        //

        casper.waitUntilVisible(

            "#gwt-debug-configAdd",

            function then () {
                var configurations = [];
                var input          = system.stdin.read();
                var conf_i;

                // TODO add a validation check to be sure the configuration
                // passed in isn't corrupt somehow, like missing properties,
                // duplicate Attribute Names, is_range=true on a STRING, etc.

                if (input.length === 0) {
                    console.error("No Dynamic Navigation configuration was passed in.");
                    exit(1);
                }

                try {
                    configurations = JSON.parse( input );
                } catch (e) {
                    console.error(e);
                    console.error("Dynamic Navigation configuration could not be parsed by JSON.parse.");
                    exit(1);
                }

                for (conf_i = 0; conf_i < configurations.length; conf_i += 1) {
                    actions.add_dnav_configuration( configurations[conf_i] );
                }
            }
        );

    };

    actions.end_state = function end_state () {

        // Log out
        casper.thenEvaluate(function () {
            $("#TopLinks a:contains(Log Out)").click();
        });

    };

    //===========================================================
    //
    // Action sequences; strings of actions to accomplish a task
    //
    // They can be a combination of common actions from above,
    // or sequence-specific actions.
    //
    //===========================================================

    action_sequences = {};

    // Scrape the current Dynamic Navigation configuration
    action_sequences.pull_dnav_configuration = [

        actions.login,

        actions.go_to_dyn_nav,

        actions.get_dnav_configurations,

        actions.end_state

    ];

    // Add a Dynamic Navigation configuration
    action_sequences.push_dnav_configuration = [

        actions.login,

        actions.go_to_dyn_nav,

        actions.always_confirm,

        actions.delete_dnav_configurations,

        actions.add_dnav_configurations,

        actions.end_state

    ];

    //================================
    //
    // Run through an action sequence
    //
    //================================

    function run_actions (action_sequence) {

        var step;
        for (step = 0; step < action_sequence.length; step += 1) {
            action_sequence[step]();
        }

        casper.run();

    }

    function helpText() {
        var text = [
            "NAME",
            "    gsa.js - send scripted commands to a Google Search Appliance",
            "",
            "USAGE",
            "    casperjs --ignore-ssl-errors=true gsa.js [OPTIONS]",
            "",
            "DESCRIPTION",
            "    help        - print this help page",
            "    list        - list all the available 'run' commands",
            "    run COMMAND - run a GSA interaction",
            "    -v          - verbose mode",
            "",
            "RUN COMMANDS",
            helpCommands(),
            "",
            "EXAMPLES",
            "    List all the available COMMANDs to use with the `run` option:",
            "        casperjs --ignore-ssl-errors=true gsa.js list",
            "",
            "    Get the current Dynamic Navigation configuration from the GSA:",
            "        casperjs --ignore-ssl-errors=true gsa.js run pull_dnav_configuration",
            "",
            "    Save the current configuration and then re-load it:",
            "        casperjs --ignore-ssl-errors=true gsa.js run pull_dnav_configuration > dnav.out",
            "        cat dnav.out | casperjs --ignore-ssl-errors=true gsa.js run push_dnav_configuration",
            "",
            "NOTES",
            "    'run' commands can take some time to execute.  ",
            ""];
        return text.join("\n");
    }

    function helpCommands() {
        var commands = [];
        var action_name;
        for (action_name in action_sequences) {
            commands.push( "    " + action_name );
        }
        return commands.join("\n");
    }

    //=============================
    //
    // Finally let's run some code
    //
    //=============================

    arg_start_index = getArgStartIndex(args);

    switch (args[arg_start_index+1]) {

        case 'help':
            console.log( helpText() );
            exit(0);
            break;

        case 'list':
            console.log(helpCommands());
            exit(0);
            break;

        case 'run':
            if (args[arg_start_index+2] in action_sequences) {
                //var interval_i = 0;
                //setInterval(function () {
                    //casper.capture('imgs/'+interval_i+".png");
                    //interval_i += 1;
                //}, 100 );
                run_actions( action_sequences[ args[arg_start_index+2] ] );
            } else {
                console.error('Invalid command name.  Valid command names are:\n' + helpCommands());
                exit(1);
            }
            break;

        default:
            console.log( helpText() );
            exit(0);
    }

})();
