gsa.js
======

A [CasperJS](https://github.com/n1k0/casperjs) script to push and pull Google Search Appliance (GSA) configurations.

Description
===========

gsa.js is currently capable of pushing and pulling Dynamic Navigation configuration.  In the GSA webapp that info is located at `Google Search Appliance > Serving > Dynamic Navigation`.

Warning
=======

gsa.js currently has no test suite.  Results have been verified by hand, but I will feel a lot better about its reliability once it has been tested by more people on more GSA's.

Since configuration data is so important, and so easy to mess up, *please* export your configuration first by logging into the GSA and going to `Administration > Import/Export`.  Now you can restore your configuration if the results from gsa.js are not what you wanted.

Tested on GSA version `7.0.14.G.114`.

USAGE
=====

casperjs --ignore-ssl-errors=true gsa.js [OPTIONS]

DESCRIPTION
===========

- **help**        - print this help page
- **list**        - list all the available 'run' commands
- **run COMMAND** - run a GSA interaction
- **-v**          - verbose mode

RUN COMMANDS
============

- **pull_dnav_configuration**
- **push_dnav_configuration**

EXAMPLES
========

List all the available COMMANDs to use with the `run` option:

    casperjs --ignore-ssl-errors=true gsa.js list

Get the current Dynamic Navigation configuration from the GSA:

    casperjs --ignore-ssl-errors=true gsa.js run pull_dnav_configuration

Save the current Dynamic Navigation configuration to a file (`dnav.out`) and then push it back to the GSA with log messages (`-v`):

    casperjs --ignore-ssl-errors=true gsa.js run pull_dnav_configuration > dnav.out
    cat dnav.out | casperjs --ignore-ssl-errors=true gsa.js run push_dnav_configuration -v

NOTES
=====

'run' commands can take some time to execute.  
