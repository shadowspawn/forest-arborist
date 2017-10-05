// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

// Mine
import core = require("../src/core");
import util = require("../src/util");


describe("core:", () => {
  it("manifestPath", () => {
    expect(util.normalizeToPosix(core.manifestPath({}))).toEqual(".fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ manifest: "custom" }))).toEqual(".fab/custom_manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main" }))).toEqual("main/.fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main", manifest: "custom" }))).toEqual("main/.fab/custom_manifest.json");
  });
});
