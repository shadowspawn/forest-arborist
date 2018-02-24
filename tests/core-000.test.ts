// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

// Mine
import core = require("../src/core");
import fs = require("fs");
import tmp = require("tmp");
import util = require("../src/util");


describe("core:", () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  afterAll(() => {
    process.chdir(startDir);
  });


  test("manifestPath", () => {
    expect(util.normalizeToPosix(core.manifestPath({}))).toEqual(".fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ manifest: "custom" }))).toEqual(".fab/custom_manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main" }))).toEqual("main/.fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main", manifest: "custom" }))).toEqual("main/.fab/custom_manifest.json");
  });


  test("cdRootDirectoy", () => {
    // Not a fab context
    expect(() => {
      core.cdRootDirectory();
    }).toThrow();

    // Make it a fake context
    fs.closeSync(fs.openSync(core.fabRootFilename, 'w'));
    expect(() => {
      core.cdRootDirectory();
    }).not.toThrow();
    // expect(process.cwd()).toBe(tempFolder.name);
  });


  test("rootFile", () => {
    const testRootOptions: core.WriteRootFileOptions = { rootFilePath: core.fabRootFilename, mainPath: ".", manifest: "foo" };
    core.writeRootFile(testRootOptions);
    const rootContents = core.readRootFile();
    expect(rootContents.mainPath).toEqual(testRootOptions.mainPath);
    expect(rootContents.manifest).toEqual(testRootOptions.manifest);
  });
});
