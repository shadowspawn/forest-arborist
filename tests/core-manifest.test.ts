import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import coreManifest = require("../src/core-manifest");


describe.skip("core manifest:", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  test("no forest", () => {
    expect(() => {
      coreManifest.doManifest({ });
    }).toThrow();
    expect(() => {
      coreManifest.doManifest({ edit: true });
    }).toThrow();
    expect(() => {
      coreManifest.doManifest({ list: true });
    }).toThrow();
    expect(() => {
      coreManifest.doManifest({ add: true });
    }).toThrow();
    expect(() => {
      coreManifest.doManifest({ delete: true });
    }).toThrow();
  });

  test("default manifest sibling", () => {
    cc.makeNestedGitForest();

    const spy = jest.spyOn(global.console, 'log');
    expect(jest.isMockFunction(console.log)).toBeTruthy();
    coreManifest.doManifest({ });
    // .toHaveBeenLastCalledWith()
    expect(console.log).toHaveBeenCalled();
    spy.mockReset();
    spy.mockRestore();

    console.log("After");
    expect(jest.isMockFunction(console.log)).toBeFalsy();
  });

});
