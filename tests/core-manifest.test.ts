import tmp = require("tmp");
// Mine
import coreManifest = require("../src/core-manifest");


describe("core manifest:", () => {
  const startDir = process.cwd();

  afterEach(() => {
    process.chdir(startDir);
  });

  test("no forest", () => {
    const tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);

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


});
