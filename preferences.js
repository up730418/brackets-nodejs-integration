define(function main(require, exports, module) {
    var extension_utils = brackets.getModule("utils/ExtensionUtils");
    var preferences_manager = brackets.getModule("preferences/PreferencesManager");
    var prefs = preferences_manager.getExtensionPrefs("brackets-nodejs-integration");

    // Default settings
    prefs.definePreference("node-bin", "string", "");
    prefs.definePreference("mocha-bin", "string", "");
    prefs.definePreference("autoscroll", "boolean", true);
    prefs.definePreference("v8-flags", "string", "");
    prefs.definePreference("configurations", "array", [
        {
            "name": "nodejs process sample",
            "cwd": "",
            "type": "node",
            "target": extension_utils.getModulePath(module, "tests/hello.js"),
            "debug": false
        },
        {
            "name": "http server sample",
            "cwd": "",
            "type": "node",
            "target": extension_utils.getModulePath(module, "tests/server.js"),
            "debug": false
        }
        ,
        {
            "name": "mocha test sample",
            "cwd": "",
            "type": "mocha",
            "target": extension_utils.getModulePath(module, "tests/mocha_test.js"),
            "debug": false
        }
    ]);

    prefs.save();
    module.exports = prefs;
});
