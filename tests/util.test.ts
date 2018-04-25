import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as util from "../src/util";


describe("util", () => {

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
    expect(fs.existsSync(path.join(tempFolder.name, "foo"))).toBe(true);
    tempFolder.removeCallback();
  });

});
