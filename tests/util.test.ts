import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as util from "../src/util";


describe("util", () => {

  test("dirExistsSync", () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(util.dirExistsSync("dir-which-do-not-expect-to-exist")).toBe(false);

    const tempFolder = tmp.dirSync({ keep: true});
    expect(util.dirExistsSync(tempFolder.name)).toBe(true);
    tempFolder.removeCallback();

    const tempFile = tmp.fileSync({ keep: true });
    expect(util.dirExistsSync(tempFile.name)).toBe(false);
    tempFile.removeCallback();

    const spy = jest.spyOn(fs, "statSync");
    spy.mockImplementation(() => {
      throw "unexpected error";
    });
    expect(() => {
      util.dirExistsSync("abc");
    }).toThrow();
    spy.mockRestore();
  });

  test("fileExistsSync", () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(util.fileExistsSync("file-which-do-not-expect-to-exist")).toBe(false);

    const tempFolder = tmp.dirSync({ keep: true });
    expect(util.fileExistsSync(tempFolder.name)).toBe(false);
    tempFolder.removeCallback();

    const tempFile = tmp.fileSync({ keep: true });
    expect(util.fileExistsSync(tempFile.name)).toBe(true);
    tempFile.removeCallback();

    const spy = jest.spyOn(fs, "statSync");
    spy.mockImplementation(() => {
      throw "unexpected error";
    });
    expect(() => {
      util.fileExistsSync("abc");
    }).toThrow();
    spy.mockRestore();
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
    const tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    util.execCommandSync(
      { cmd: "git", args: ["init", "foo"], cwd: tempFolder.name }
    );
    expect(util.dirExistsSync(path.join(tempFolder.name, "foo"))).toBe(true);
    tempFolder.removeCallback();
  });

});
