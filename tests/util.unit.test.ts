// Mine
import * as util from "../src/util";


describe.only("shouldDisableColour:", () => {
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
