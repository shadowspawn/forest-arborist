import path = require("path");
import tmp = require("tmp");
// Mine
import util = require("../src/util");


describe("util:", () => {
  test("normalizeToPosix", () => {
    // On win32 turn a\\b into a/b
    const nativePath = path.join("a", "b", "c");
    expect(util.normalizeToPosix(nativePath)).toEqual("a/b/c");

    // Produce a single identity form for path.
    expect(util.normalizeToPosix("")).toEqual(".");
    expect(util.normalizeToPosix(undefined)).toEqual(".");

    // Terminate should throw
    expect(() => {
      util.terminate("Goodbye");
    }).toThrowError(util.suppressTerminateExceptionMessage);

    // // Simple check that message gets preserved in styled text
    const sampleString = "Aa+Bb (Yy-Zz)";
    expect(util.errorColour(sampleString)).toContain(sampleString);
    expect(util.commandColour(sampleString)).toContain(sampleString);

    // isRelativePath
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
  
});
