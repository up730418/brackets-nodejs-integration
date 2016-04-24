(function () {
    'use strict';

    var treekill = require('treekill');
    var child_process = require('child_process');
    var domain = null;
    var child = null;
    var path = require('path');
    var DOMAIN_NAME = path.basename(__filename);
    //var DOMAIN_NAME = 'brackets-nodejs-integration';

    function cmd_start_process(command, cwd, callback) {
        if (child !== null) {
            treekill(child.pid);
        }

        child = child_process.exec(command, {
            cwd: cwd,
            maxBuffer: 10 * 1024 * 1024

        }, function (error, stdout, stderr) {
            if (error) {
                error.stderr = stderr;
            }
            callback(null, error);
        });

        var send = function (data) {
            data = data.toString();
            if (data) {
                data.split(/\r\n|\r|\n/g).forEach(function (output_string) {
                    if (output_string) {
                        //extract mocha events and emit mocha event
                        var mocha_events = output_string.match(/###mocha_event_start###(.*)###mocha_event_end###/gm);
                        if (mocha_events) {
                            mocha_events.forEach(function (mocha_event) {
                                output_string = output_string.replace(mocha_event, '');
                                send_reporter_output(mocha_event.replace('###mocha_event_start###', '').replace('###mocha_event_end###', ''));
                            });
                        }
                        //for the rest emit console event
                        send_console_output(output_string);
                    }
                });
            }
        };

        function send_console_output(data) {
            // Support for ansi colors and text decorations
            data = data.replace(/\x1B\[/g, '\\x1B[');
            domain.emitEvent(DOMAIN_NAME, 'console_output', data);
        }

        function send_reporter_output(data) {
            domain.emitEvent(DOMAIN_NAME, 'reporter_output', data);
        }

        child.stdout.on('data', send);
        child.stdin.on('data', send);
    }

    function cmd_stop_process() {
        if (child !== null) {
            treekill(child.pid);
        }
    }

    function init(domainManager) {
        var DOMAIN_NAME = path.basename(__filename);
        domain = domainManager;
        if (!domainManager.hasDomain(DOMAIN_NAME)) {
            domainManager.registerDomain(DOMAIN_NAME, {
                major: 0,
                minor: 1
            });
        }

        domainManager.registerCommand(
            DOMAIN_NAME,
            'start_process',
            cmd_start_process,
            true,
            'Starts the process using the supplied command', [
                {
                    name: 'command',
                    type: 'string'
                },
                {
                    name: 'cwd',
                    type: 'string'
                }
            ]
        );

        domainManager.registerCommand(
            DOMAIN_NAME,
            'stop_process',
            cmd_stop_process,
            false,
            'Stops the process if one is already started', []
        );

        domainManager.registerEvent(
            DOMAIN_NAME,
            'console_output', [
                {
                    name: 'output',
                    type: 'string'
                }
            ]
        );

        domainManager.registerEvent(
            DOMAIN_NAME,
            'reporter_output', [
                {
                    name: 'output',
                    type: 'string'
                }
            ]
        );
    }

    exports.init = init;

}());
