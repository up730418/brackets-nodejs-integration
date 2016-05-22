/*global define, $, brackets */
'use strict';

define(function (require, exports) {

    var command_manager = brackets.getModule('command/CommandManager');
    var commands = brackets.getModule('command/Commands');
    var panel_manager = brackets.getModule('view/PanelManager');
    var preferences_manager = brackets.getModule('preferences/PreferencesManager');
    var prefs = preferences_manager.getExtensionPrefs('brackets-nodejs-integration');
    var menus = brackets.getModule('command/Menus');

    var LOCALS_CONTEXT_MENU_ID = 'brackets-nodejs-integration-locals-context-menu';

    var _maxDepth = 3;
    var history = [];
    var historyCurrent = 0;
    var logContainerHTML = require('text!./assets/debuggerLog.html');

    exports.create_new = function () {
        return new DebuggerPanel();
    };

    var DebuggerPanel = function () {
        this.panel = null;
        this.$logPanel = $(null);
        this.$debuggerContent = $(null);
        this.$debuggerSideBar = $(null);
        this.$debuggerInput = $(null);
        this._nodeDebuggerDomain = null;
    };

    /*
     * KeyHandler for the inputfield
     */
    function onKeyDown(e, that) {
        //On enter send command
        if (e.keyCode === 13) {
            //Remove all may existing suggestions
            that.$debuggerInput.find('.suggestion').remove();
            var com = that.$debuggerInput.val();

            if (com.length > 0) {
                history.push(com);
                historyCurrent = history.length;
                that.log($('<span>').text('>> ' + com));
                that._nodeDebuggerDomain.exec('eval', com);
                //reset the input field
                that.$debuggerInput.val('');
            }
        }
        //On key up/down scroll through history
        if (e.keyCode === 40) {
            historyCurrent++;
            if (history[historyCurrent]) {
                that.$debuggerInput.val(history[historyCurrent]);
            }
            else {
                historyCurrent = history.length;
                that.$debuggerInput.val('');
            }
            //e.preventDefault();
        }
        if (e.keyCode === 38) {
            historyCurrent--;
            if (history[historyCurrent]) {
                that.$debuggerInput.val(history[historyCurrent]);
            }
            else {
                historyCurrent = 0;
            }
            e.preventDefault();
        }
    }

    /*
     * click event handler to give more Information about an object in the console
     */
    function evalHTMLonClick(e) {
        var $t = $(e.target);
        if ($t.hasClass('fa-chevron-right')) {
            $t.removeClass('fa-chevron-right').addClass('fa-chevron-down');
            $t.siblings().removeClass('hidden');
        }
        else {
            if ($t.hasClass('fa-chevron-down')) {
                $t.removeClass('fa-chevron-down').addClass('fa-chevron-right');
                $t.siblings().addClass('hidden');
            }
        }
    }

    /**
     * Initialize the panel
     *
     * @param {NodeDomain} nodeDebuggerDomain
     **/
    DebuggerPanel.prototype.init = function (nodeDebuggerDomain, domain_id) {
        //Create the BottomPanel
        this.panel = $('#' + domain_id).find('.brackets-nodejs-integration-debugger').html($(logContainerHTML)).show();
        this.$logPanel = $('#' + domain_id).find('.brackets-nodejs-integration-debugger-log-panel');
        _maxDepth = prefs.get('lookupDepth');
        this._nodeDebuggerDomain = nodeDebuggerDomain;

        //Find HTML
        this.$debuggerContent = this.$logPanel.find('.brackets-nodejs-integration-debugger-content');
        this.$debuggerCallbackStack = this.$logPanel.find('.brackets-nodejs-integration-debugger-callback-stack');
        this.$debuggerSideBar = this.$logPanel.find('.brackets-nodejs-integration-debugger-sidebar');
        this.$debuggerInput = this.$logPanel.find('.brackets-nodejs-integration-debugger-input');

        //Add keydown handler to input
        var that = this;
        this.$debuggerInput.on('keyup', function (e) {
            onKeyDown(e, that);
        });


        //Add help button
        var $help = $('<a>').html('<i class="fa fa-question-circle" aria-hidden="true"></i>')
            .attr('href', 'https://github.com/yacut/brackets-nodejs-integration#how-to-use-debugger')
            .attr('title', 'Help!');
        this.addControlElement($help, false, function () {});

        //Add clear console button
        var $clear = $('<a>').attr('href', '#').attr('title', 'Clear console').html('<i class="fa fa-trash" aria-hidden="true"></i>');

        this.addControlElement($clear, false, function () {
            that.$debuggerContent.html($('.brackets-nodejs-integration-debugger-input-wrapper'));
            //set the keyHandler again
            that.$debuggerInput.on('keydown', function (e) {
                onKeyDown(e, that);
            });
        });

        this._nodeDebuggerDomain.on('afterCompile', function (e, body) {
            if (body && body.script && body.script.name) {
                var $callback_file = $('<li>').text(body.script.name).on('click', function () {
                    command_manager.execute(commands.FILE_OPEN, {
                        fullPath: $(this).text()
                    });
                });
                $callback_file.prependTo(that.$debuggerCallbackStack);
            }
        });

        //add show console button
        var $show_console = $('<a>').attr('href', '#').attr('title', 'Console').html('<i class="fa fa-terminal"></i>');
        this.addControlElement($show_console, false, function () {
            var $domain = $('#' + domain_id);
            var $callback_stack = $domain.find('.brackets-nodejs-integration-debugger-callback-stack');
            var $sidebar = $domain.find('.brackets-nodejs-integration-debugger-sidebar');
            var $content = $domain.find('.brackets-nodejs-integration-debugger-content');
            var $console_input = $domain.find('.brackets-nodejs-integration-debugger-input');
            if ($content.is(':visible')) {
                $sidebar.show();
                $callback_stack.hide();
                $console_input.hide();
                $content.show();
            }
            else {
                $callback_stack.hide();
                $sidebar.hide();
                $content.show();
                $console_input.show().select();
                $(that).toggleClass('brackets-nodejs-integration-debugger-selected-button').find('i').toggleClass('fa-bold');
            }
        });

        //add show callback stack button
        var $callback_stack_link = $('<a>').attr('href', '#').attr('title', 'Callback stack').html('<i class="fa fa-indent"></i>');
        this.addControlElement($callback_stack_link, false, function () {
            var $domain = $('#' + domain_id);
            var $callback_stack = $domain.find('.brackets-nodejs-integration-debugger-callback-stack');
            var $sidebar = $domain.find('.brackets-nodejs-integration-debugger-sidebar');
            var $content = $domain.find('.brackets-nodejs-integration-debugger-content');
            if ($callback_stack.is(':visible')) {
                $callback_stack.hide();
                $sidebar.show();
                $content.hide();
            }
            else {
                $callback_stack.show();
                $sidebar.hide();
                $content.hide();
            }
        });
    };

    /**
     *Adds a new line to the log within brackets
     **/
    DebuggerPanel.prototype.log = function ($msg) {
        var $h = $('<div>')
            .addClass('brackets-nodejs-integration-debugger-log');

        $h.append($msg);
        $h.insertBefore($('.brackets-nodejs-integration-debugger-input-wrapper'));
        this.$debuggerInput.focus();
        //Scroll to the bottom
        this.$debuggerContent.scrollTop(9999999999999);
    };

    /**
     * Adds a new element to the debugger panel
     *
     * @param {jQuery Element} The jQuery element that will be added to the panel
     * @param {boolean} If true element will be in the top row, false: bottom row
     * @param {function} clickHandler
     **/
    DebuggerPanel.prototype.addControlElement = function ($el, top, clickHandler) {
        var $t = $(null);
        if (top) {
            $t = this.$logPanel.find('.toolbar.top');
        }
        else {
            $t = this.$logPanel.find('.toolbar.bottom');
        }

        $el.prependTo($t).on('click', clickHandler);
    };

    /**
     * Creates the HTML from the eval response
     * @param {object} body The object we get from the debugger
     * @param {number} depth How deep are we going? (Just in case we've got circle stuff)
     * @param {object} Initally the body.lookup propertie
     * @return {jquery object} A jquery HTML object you can inject into the console
     **/
    DebuggerPanel.prototype.createEvalHTML = function (body, depth, lookup, maxDepth) {
        var $html = $('<span>').css('display', 'block');
        var $inside = $('<span>');
        var object_name = '';
        var object_value = '';
        var that = this;
        depth++;
        var type_icon = '';
        //Exception for Date Object
        if (body.type === 'object' && body.properties.length > 0 && (body.className !== 'Date')) {
            var o = {};
            body.properties.forEach(function (p) {
                if (lookup[p.ref]) {
                    o[p.name] = lookup[p.ref].text;
                    lookup[p.ref].varName = p.name;
                    if (depth <= maxDepth) { // Don't go too deep
                        that.createEvalHTML(lookup[p.ref], depth, lookup, maxDepth).addClass('var hidden').appendTo($html);
                    }
                    $inside.addClass('object fa fa-chevron-right');
                }
            });
            if (body.className === 'Array') {
                type_icon = '<i class="fa fa-list-ol" aria-hidden="true"></i>';
            }
            else {
                type_icon = '<i class="fa fa-bars" aria-hidden="true"></i>';
            }
            $inside.text(body.text).on('click', evalHTMLonClick);
            object_value = JSON.stringify(o, null, 2);
        }
        else if (body.type === 'function') {
            var function_head = body.text.split('{')[0] || 'function()';
            $inside.text(function_head + '{');
            object_value = body.text;
            type_icon = '<i class="fa fa-bars" aria-hidden="true"></i>';
        }
        else if (body.type === 'string') {
            $inside.text('"' + body.text + '"');
            object_value = body.text;
            type_icon = '<span class="fa-stack fa-1x" style="width: 1em;height: 1em;line-height: 1em;"><i class="fa fa-square fa-stack-2x" style="font-size: 1.2em;"></i><strong class="fa-stack-1x text-primary" style="color: white;font-size: 70%;">ab</strong></span>';
        }
        else if (body.type === 'number') {
            $inside.text(body.text);
            object_value = body.text;
            type_icon = '<span class="fa-stack fa-1x" style="width: 1em;height: 1em;line-height: 1em;"><i class="fa fa-square fa-stack-2x" style="font-size: 1.2em;"></i><strong class="fa-stack-1x text-primary" style="color: white;font-size: 60%;">01</strong></span>';
        }
        else {
            $inside.text(body.text);
            object_value = body.text;
            type_icon = '<i class="fa fa-bars" aria-hidden="true"></i>';
        }

        if (body.varName) {
            $('<span>').addClass('var-name').text(body.varName + ' = ').prependTo($inside);
            object_name = body.varName;
        }
        var $type = $('<span>').addClass('type').addClass('action_btn')
            .html(type_icon)
            .attr('href', '#').attr('title', 'Click to copy value')
            .attr('object_value', object_value)
            .on('click', function () {
                copy_to_clipboard($(this).attr('object_value'));
            });

        $type.prependTo($inside);

        $inside.prependTo($html);
        return $html;
    };

    function copy_to_clipboard(text) {
        var textArea = document.createElement('textarea');
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = 0;
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        }
        catch (err) {
            console.error(err);
        }
        document.body.removeChild(textArea);
    }
});
