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

var DNAV_TYPES = {};

(function () {

// This is a module containing JavaScript data types which represent the
// Dynamic Navigation configuration information of the Google Search Appliance.

var type;

//==============================================================================
// 
// First, here are some enum-ish types that represent option values the GSA web
// app uses.
//
// Reverse lookups are automatically generated for any map whose name contains
// "NameToValueMap".
// 
//==============================================================================

/**
 * Map from Attribute Names to Attribute Values.  
 *
 * In the GSA web app, Attribute Names are used as the display text in the
 * AttributeName select menu.  Values are used as the value, like so:
 *
 *     <option value="gsaentity_City">City</option>
 *
 * They keys in this object can also be used as a reference for valid Attribute
 * Names.
 */

DNAV_TYPES.AttributeNameToValueMap = {
    CITY     : "gsaentity_City",
    COUNTRY  : "gsaentity_Country",
    DATE     : "gsaentity_Date",
    LOCATION : "gsaentity_Location"
};

DNAV_TYPES.SortByNameToValueMap = {
    COUNT : "gwt-debug-sortByCount-input",
    VALUE : "gwt-debug-sortByValue-input"
};

DNAV_TYPES.SortOrderNameToValueMap = {
    DESCENDING : "gwt-debug-sortDesc-input",
    ASCENDING  : "gwt-debug-sortAsc-input"
};

DNAV_TYPES.AuthzTypeNameToValueMap = {
    FAST : "gwt-debug-authzTypeFast-input",
    ALL  : "gwt-debug-authzTypeAll-input"
};

/**
 * Maps Attribute Types to their values
 */

DNAV_TYPES.AttributeTypeNameToValueMap = {
    STRING   : 0,
    INTEGER  : 1,
    FLOAT    : 2,
    CURRENCY : 3,
    DATE     : 4
};

//==============================================================================
// 
// And here are some types that represent actual records added by the user.
// They have default values.  It's best to inherit from these objects instead
// of modifying them 
// directly.
// 
//==============================================================================

/**
 * Dynamic Navigation Configuration
 */
DNAV_TYPES.Configuration = {
    name                 : "",
    attributes           : [],
    added_front_ends     : [],
    enable_secure_search : false,
    auth_type            : "" // key from AuthzType

};

DNAV_TYPES.AvailableFrontEnds = [];

/**
 * Attributes of a Type with range:true will have one or more Range objects in
 * their ranges array.
 */
DNAV_TYPES.Range = {
    low  : undefined,
    high : undefined
};

/**
 * A Dynamic Nav Attribute with default values.  All Attributes should inherit
 * from this object.
 */
DNAV_TYPES.Attribute = {
    display_label  : "",    // any string
    attribute_name : "",    // any key from AttributeNames
    type           : "",    // any key from AttributeTypes
    sort_by        : "",    // any key from SortBy
    sort_order     : "",    // any key from SortOrder
    is_range       : false, // any boolean
    ranges         : [],    // this array should contain Ranges (see DNAV_TYPES.Range)
    is_entity      : false
};

DNAV_TYPES.reverse = function reverse (obj) {
    var rev = {},
        prop;
    for (prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            rev[obj[prop]] = prop;
        }
    }
    return rev;
};

// Clone function from
// http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
//
// used to make "deep" copies of the other objects in this 
DNAV_TYPES.clone = function (obj) {

    var copy, i, attr;

    // Handle the 3 simple types, and null or undefined
    if ("undefined" === typeof obj || "object" !== typeof obj) {
        return obj;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = DNAV_TYPES.clone(obj[attr]);
            }
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");

};

for (type in DNAV_TYPES) {
    if (DNAV_TYPES.hasOwnProperty(type)) {

        // Generate reverse mappings (create ValueToName maps from the
        // NameToValue maps)
        var t = type.indexOf("NameToValueMap"); 
        if (t > 0) {
            var n = type.substr(0,t);
            DNAV_TYPES[ n + "ValueToNameMap" ] = DNAV_TYPES.reverse( DNAV_TYPES[type] );
        }
    }
}

}());
