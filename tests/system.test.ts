import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as command from "../src/command";
import * as sandpit from "./sandpit";
import * as util from "../src/util";


describe("system (full functionality)", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let pinnedRevision: string;
  let nestedRoot: string;
  let siblingRoot: string;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    pinnedRevision = sandpit.makePlayground(tempFolder.name);
    process.chdir(tempFolder.name);
    nestedRoot = path.join(process.cwd(), "nested");
    siblingRoot = path.join(process.cwd(), "sibling");
    process.chdir(startDir);
});

  afterAll(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("unexpected command throws", () => {
    expect(() => {
      command.fab(["unexpected-command"]);
    }).toThrow(util.suppressTerminateExceptionMessage);
  });


  describe ("test display commands", () => {
    let spy: jest.SpyInstance;

    beforeAll(() => {
      spy = jest.spyOn(global.console, 'log');
    });

    afterAll(() => {
      spy.mockRestore();
    });

    test("root (no forest) throws", () => {
      expect(() => {
        command.fab(["root"]);
      }).toThrow();
    });

    test("root from nested root", () => {
      process.chdir("nested");
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("root from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("root from sibling root", () => {
      process.chdir("sibling");
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("root from sibling main", () => {
      process.chdir(path.join("sibling", "main"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("root from sibling forest", () => {
      process.chdir(path.join("sibling", "libs"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("main from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("main from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("main from sibling forest", () => {
      process.chdir(path.join("sibling", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(path.join(siblingRoot, "main"));
      });

  });

});
