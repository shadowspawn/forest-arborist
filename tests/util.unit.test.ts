import * as childProcess from "child_process";
import * as fsX from "fs-extra";
import * as path from "path";
// Mine
import * as util from "../src/util";


describe("shouldDisableColour", () => {
  const holdForceColor = process.env["FORCE_COLOR"];
  const holdNoColor = process.env["NO_COLOR"];

  beforeAll(() => {
    delete process.env["FORCE_COLOR"];
    delete process.env["NO_COLOR"];
  });

  afterAll(() => {
    util.restoreEnvVar("FORCE_COLOR", holdForceColor);
    util.restoreEnvVar("NO_COLOR", holdNoColor);
  });

  function checkShouldDisableAlways(expectedValue: boolean) {
    // Default/current platform
    expect(util.shouldDisableColour()).toEqual(expectedValue);
    // Supported platforms
    expect(util.shouldDisableColour("darwin")).toEqual(expectedValue);
    expect(util.shouldDisableColour("win32")).toEqual(expectedValue);
    expect(util.shouldDisableColour("linux")).toEqual(expectedValue);
  }

  test("platform", () => {
    // Disable colour on Windows.
    expect(util.shouldDisableColour()).toEqual(process.platform === "win32");
    expect(util.shouldDisableColour("darwin")).toEqual(false);
    expect(util.shouldDisableColour("win32")).toEqual(true);
    expect(util.shouldDisableColour("linux")).toEqual(false);
  });

  test("NO_COLOR", () => {
    // Disable colour if NO_COLOR defined.
    // http://no-color.org
    process.env["NO_COLOR"] = "1";
    checkShouldDisableAlways(true);
    process.env["NO_COLOR"] = "0";
    checkShouldDisableAlways(true);
    delete process.env["NO_COLOR"];
  });

  test("FORCE_COLOR", () => {
    // Leave FORCE_COLOR up to Chalk.
    // https://www.npmjs.com/package/chalk#chalksupportscolor
    process.env["FORCE_COLOR"] = "1";
    checkShouldDisableAlways(false);
    process.env["FORCE_COLOR"] = "0";
    checkShouldDisableAlways(false);
    delete process.env["FORCE_COLOR"];
  });
});


describe("terminate", () => {

  test("throws", () => {
      expect(() => {
        util.terminate("Goodbye");
      }).toThrowError(util.suppressTerminateExceptionMessage);
    });

  test("displays message", () => {
    const message = "custom message";
    const spy = jest.spyOn(global.console, 'error');
    try {
      util.terminate(message);
    } catch(err) {
    }
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain(message);
    spy.mockRestore();
  });

});


describe("restoreEnvVar", () => {
  const key = "FOREST_ARBORIST_RESTORE_ENV_VAR_KEY";

  afterEach(() => {
    delete process.env[key];
  });

  test("restores defined value", () => {
    delete process.env[key];
    util.restoreEnvVar(key, "1");
    expect(process.env[key]).toEqual("1");

    process.env[key] = "existing value";
    util.restoreEnvVar(key, "2");
    expect(process.env[key]).toEqual("2");

  });

  test("restores missing value", () => {
    delete process.env[key];
    util.restoreEnvVar(key);
    expect(process.env[key]).toBeUndefined();
    expect(key in process.env).toBe(false);

    process.env[key] = "existing value";
    util.restoreEnvVar(key);
    expect(process.env[key]).toBeUndefined();
    expect(key in process.env).toBe(false);
  });

});


test("coloured text", () => {
  // Simple check that message gets included in styled text
   const sampleString = "Aa+Bb (Yy-Zz)";
   expect(util.errorColour(sampleString)).toContain(sampleString);
   expect(util.commandColour(sampleString)).toContain(sampleString);
 });


describe("normalizeToPosix", () => {

  test("native", () => {
    const nativePath = path.join("a", "b", "c");
    expect(util.normalizeToPosix(nativePath)).toEqual("a/b/c");
  });

  test("win32", () => {
    util.setPlatformForTest("win32");
    const winPath = path.win32.join("a", "b", "c");
    expect(util.normalizeToPosix(winPath)).toEqual("a/b/c");
    util.setPlatformForTest(process.platform);
  });

  test("identity", () => {
    expect(util.normalizeToPosix("")).toEqual(".");
    expect(util.normalizeToPosix(undefined)).toEqual(".");
    });

});


describe("execCommandSync", () => {
  // Testing the key functionality, but not the command logging.

  test("allowedShellStatus", () => {
    const spy = jest.spyOn(childProcess, 'execFileSync');
    spy.mockImplementation(() => {
      throw({ status: 99 });
    });

    expect(() => {
      util.execCommandSync("command");
    }).toThrow();

    expect(() => {
      util.execCommandSync("command", [], { allowedShellStatus: 99 });
    }).not.toThrow();

    spy.mockRestore();
  });

  test("cwd", () => {
    const spy = jest.spyOn(childProcess, 'execFileSync');
    spy.mockImplementation(() => {
      // do nothing
    });

    util.execCommandSync("command");
    expect(spy).toHaveBeenLastCalledWith("command", undefined, { "cwd": ".", "stdio": "pipe" });

    util.execCommandSync("command", ["a", "b"]);
    expect(spy).toHaveBeenLastCalledWith("command", ["a", "b"], { "cwd": ".", "stdio": "pipe" });

    util.execCommandSync("command", undefined, { cwd: "dir" });
    expect(spy).toHaveBeenLastCalledWith("command", undefined, { "cwd": "dir", "stdio": "pipe" });

    spy.mockRestore();
  });

});


test("readJson", () => {
  const subject = { required: "value", extra: "extra" };
  const spy = jest.spyOn(fsX, 'readJsonSync');
  spy.mockImplementation(() => {
    return subject;
  });

  expect(util.readJson('dummyFile')).toEqual(subject);
  expect(util.readJson('dummyFile', ["required"])).toEqual(subject);
  expect(() => {
    util.readJson('dummyFile', ["missing"]);
  }).toThrow();

  spy.mockRestore();
});
