// Checking parsing the CLI interface generates the expected internal calls.
// clone as proof of concept
//
// pattern:
// - least
// - each individual
// - most

import * as command from "../src/command";
// Mine
import * as coreClone from "../src/core-clone";
import * as coreForEach from "../src/core-for";
import * as coreInit from "../src/core-init";


describe("clone cli", () => {
  const cloneSpy = jest.spyOn(coreClone, 'doClone');

  beforeAll(() => {
    cloneSpy.mockImplementation((source, destination, options) => {
      // do not call through
    });
  });

  afterAll(() => {
    cloneSpy.mockRestore();
  });

  afterEach(() => {
    cloneSpy.mockReset();
  });

  // least
  test("clone source", () => {
    command.fab(["clone", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ }));
    const options: coreClone.CloneOptions = cloneSpy.mock.calls[0][2];
    expect(options.branch).toBeUndefined();
    expect(options.manifest).toBeUndefined();
  });

  test("clone source destination", () => {
    command.fab(["clone", "source", "destination"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", "destination", expect.objectContaining({ }));
  });

  test("clone -b name source", () => {
    command.fab(["clone", "-b", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ branch: "name" }));
  });

  test("clone --branch name source", () => {
    command.fab(["clone", "--branch", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ branch: "name" }));
  });

  test("clone -m name source", () => {
    command.fab(["clone", "-m", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ manifest: "name" }));
  });

  test("clone --manifest name source", () => {
    command.fab(["clone", "--manifest", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ manifest: "name" }));
  });

  // most
  test("clone --branch branchName --manifest manifestName source destination", () => {
    command.fab(["clone", "--branch", "branchName", "--manifest", "manifestName", "source", "destination"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", "destination", expect.objectContaining({ branch: "branchName", manifest: "manifestName" }));
  });

});


describe("init cli", () => {
  const initSpy = jest.spyOn(coreInit, 'doInit');

  beforeAll(() => {
    initSpy.mockImplementation((options) => {
      // do not call through
    });
  });

  afterAll(() => {
    initSpy.mockRestore();
  });

  afterEach(() => {
    initSpy.mockReset();
  });

  // least
  test("init", () => {
    command.fab(["init"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ }));
    const options: coreInit.InitOptions = initSpy.mock.calls[0][0];
    expect(options.manifest).toBeUndefined();
    expect(options.root).toBeUndefined();
  });

  test("init --root ..", () => {
    command.fab(["init", "--root", ".."]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ root: ".." }));
  });

  test("init -m name", () => {
    command.fab(["init", "-m", "name"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

  test("init --manifest name", () => {
    command.fab(["init", "--manifest", "name"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

  // most
  test("init --manifest name --root ..", () => {
    command.fab(["init", "--manifest", "name", "--root", ".."]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name", root: ".." }));
  });

});


describe("install cli", () => {
  const installSpy = jest.spyOn(coreClone, 'doInstall');

  beforeAll(() => {
    installSpy.mockImplementation((options) => {
      // do not call through
    });
  });

  afterAll(() => {
    installSpy.mockRestore();
  });

  afterEach(() => {
    installSpy.mockReset();
  });

  // least
  test("install", () => {
    command.fab(["install"]);
    expect(installSpy).toHaveBeenCalledWith(expect.objectContaining({ }));
    const options: coreClone.InstallOptions = installSpy.mock.calls[0][0];
    expect(options.manifest).toBeUndefined();
  });

  test("install -m name", () => {
    command.fab(["install", "-m", "name"]);
    expect(installSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

  test("install --manifest name", () => {
    command.fab(["install", "--manifest", "name"]);
    expect(installSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

});


describe.only("for cli", () => {
  const forEachSpy = jest.spyOn(coreForEach, 'doForEach');

  beforeAll(() => {
    forEachSpy.mockImplementation((cmd: string, args: string[], options: ForOptions) => {
      // do not call through
    });
  });

  afterAll(() => {
    forEachSpy.mockRestore();
  });

  afterEach(() => {
    forEachSpy.mockReset();
  });

  // least
  test("for-each command", () => {
    command.fab(["for-each", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ }));
    const options: coreForEach.ForOptions = forEachSpy.mock.calls[0][2];
    expect(options.freeOnly).toBeUndefined();
    expect(options.keepgoing).toBeUndefined();
  });

  test("for-each -k command", () => {
    command.fab(["for-each", "-k", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ keepgoing: true }));
  });

  test("for-each --keepgoing command", () => {
    command.fab(["for-each", "--keepgoing", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ keepgoing: true }));
  });

  // alias
  test("forEach --keepgoing command", () => {
    command.fab(["forEach", "--keepgoing", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ keepgoing: true }));
  });

  // most
  test("for-each --keepgoing -- command --option a b c", () => {
    command.fab(["for-each", "--keepgoing", "--", "command", "--option", "a", "b", "c"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", ["--option", "a", "b", "c"], expect.objectContaining({ keepgoing: true }));
  });

  // least
  test("for-free command", () => {
    command.fab(["for-free", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ freeOnly: true }));
    const options: coreForEach.ForOptions = forEachSpy.mock.calls[0][2];
    expect(options.keepgoing).toBeUndefined();
  });

  test("for-free -k command", () => {
    command.fab(["for-free", "-k", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ freeOnly: true, keepgoing: true }));
  });

  test("for-free --keepgoing command", () => {
    command.fab(["for-free", "--keepgoing", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ freeOnly: true, keepgoing: true }));
  });

  // most
  test("for-free --keepgoing command a b c", () => {
    command.fab(["for-free", "--keepgoing", "--", "command", "--option", "a", "b", "c"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", ["--option", "a", "b", "c"], expect.objectContaining({ freeOnly: true, keepgoing: true }));
  });

});
