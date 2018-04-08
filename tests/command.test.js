"use strict";
// Partly a placeholder,  developing patterns for testing command (i.e. proxy for CLI)
exports.__esModule = true;
var tmp = require("tmp");
// Mine
var command = require("../src/command");
describe("cli proxy:", function () {
    var startDir = process.cwd();
    var program;
    beforeAll(function () {
    });
    afterAll(function () {
        process.chdir(startDir);
    });
    beforeEach(function () {
        // process.chdir(tempFolder.name);
        program = command.makeProgram();
    });
    afterEach(function () {
        // process.chdir(startDir);
    });
    test("root", function () {
        var tempFolder = tmp.dirSync({ unsafeCleanup: true });
        process.chdir(tempFolder.name);
        expect(function () {
            program.root();
        }).toThrow();
    });
});
