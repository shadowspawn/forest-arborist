import chalk = require("chalk");
import fs = require("fs");
import path = require("path");
import tmp = require("tmp");
// Mine
import util = require("../src/util");


describe("shouldDisableColour:", () => {
  const holdPlatform = util.platform;
  const holdForceColor = process.env["FORCE_COLOR"];
  const holdNoColor = process.env["NO_COLOR"];

  beforeEach(() => {
    util.platform = holdPlatform;
    delete process.env["FORCE_COLOR"];
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    util.platform = holdPlatform;
    util.restoreEnvVar("FORCE_COLOR", holdForceColor);
    util.restoreEnvVar("NO_COLOR", holdNoColor);
  });

  function testShouldDisable() {
    // default
    expect(util.shouldDisableColour()).toEqual(util.platform === "win32");

    process.env["NO_COLOR"] = "1";
    expect(util.shouldDisableColour()).toEqual(true);
    delete process.env["NO_COLOR"];

    // FORCE_COLOR means we leave it to Chalk, so always false.
    process.env["FORCE_COLOR"] = "1";
    expect(util.shouldDisableColour()).toEqual(false);
    process.env["FORCE_COLOR"] = "0";
    expect(util.shouldDisableColour()).toEqual(false);
  }

  test("native", () => {
    testShouldDisable();
  });

  test("win32", () => {
    util.platform = "win32";
    testShouldDisable();
  });

  test("non-Windows", () => {
    util.platform = "darwin";
    testShouldDisable();
  });
});


describe("util:", () => {

  test("normalizeToPosix", () => {
    const nativePath = path.join("a", "b", "c");
    expect(util.normalizeToPosix(nativePath)).toEqual("a/b/c");

    const holdPlatform = util.platform;
    util.platform = "win32";
    const winPath = path.win32.join("a", "b", "c");
    expect(util.normalizeToPosix(winPath)).toEqual("a/b/c");
    util.platform = holdPlatform;

    // Produce a single identity form for path.
    expect(util.normalizeToPosix("")).toEqual(".");
    expect(util.normalizeToPosix(undefined)).toEqual(".");
  });

  test("terminate", () => {
    // Terminate should throw
    expect(() => {
      util.terminate("Goodbye");
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("someColour", () => {
   // // Simple check that message gets preserved in styled text
    const sampleString = "Aa+Bb (Yy-Zz)";
    expect(util.errorColour(sampleString)).toContain(sampleString);
    expect(util.commandColour(sampleString)).toContain(sampleString);
  });

  test("isRelativePath", () => {
    expect(util.isRelativePath(<any>null)).toBe(false);
    expect(util.isRelativePath(<any>undefined)).toBe(false);
    expect(util.isRelativePath("")).toBe(false);
    expect(util.isRelativePath("a")).toBe(false);
    expect(util.isRelativePath("a/b")).toBe(false);
    expect(util.isRelativePath("a/../b")).toBe(false);
    expect(util.isRelativePath("/")).toBe(false);
    expect(util.isRelativePath("/absolute")).toBe(false);
    expect(util.isRelativePath("./relative")).toBe(true);
    expect(util.isRelativePath("../relative")).toBe(true);
  });

  test("dirExistsSync", () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(util.dirExistsSync("dir-which-do-not-expect-to-exist")).toBe(false);

    const tempFolder = tmp.dirSync();
    expect(util.dirExistsSync(tempFolder.name)).toBe(true);

    const tempFile = tmp.fileSync();
    expect(util.dirExistsSync(tempFile.name)).toBe(false);
  });

  test("fileExistsSync", () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(util.fileExistsSync("file-which-do-not-expect-to-exist")).toBe(false);

    const tempFolder = tmp.dirSync();
    expect(util.fileExistsSync(tempFolder.name)).toBe(false);

    const tempFile = tmp.fileSync();
    expect(util.fileExistsSync(tempFile.name)).toBe(true);
  });

  test("readJson", () => {
    const tmpPath = tmp.tmpNameSync();

    const notJson = "hello";
    fs.writeFileSync(tmpPath, notJson);
    expect(() => {
      util.readJson(tmpPath, []);
    }).toThrowError();

    const writeObject = { undefinedField: undefined, key: "value" };
    fs.writeFileSync(tmpPath, JSON.stringify(writeObject));
    expect(() => {
      util.readJson(tmpPath, ["required-field-missing"]);
    }).toThrowError();
    expect(() => {
      util.readJson(tmpPath, ["undefinedField"]);
    }).toThrowError();
    const readObject =  util.readJson(tmpPath, ["key"]);
    console.log(readObject);
    expect(readObject.key).toEqual("value");

    fs.unlinkSync(tmpPath);
  });

  test("execCommandSync", () => {
    // Most of execCommandSync is about nice output, do some simple checks.
    // Bad command throws. Relying on behaviour of git here, cross-platform commands are limited!
    expect(() => {
      util.execCommandSync({ cmd: "git" });
    }).toThrowError();
    expect(() => {
      util.execCommandSync({ cmd: "git", allowedShellStatus: 1 });
    }).not.toThrowError();

    // cwd changes working directory.
    const tempFolder = tmp.dirSync({ unsafeCleanup: true });
    util.execCommandSync(
      { cmd: "git", args: ["init", "foo"], cwd: tempFolder.name }
    );
    expect(util.dirExistsSync(path.join(tempFolder.name, "foo"))).toBe(true);
});

});
