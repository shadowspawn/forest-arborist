// Checking parsing the CLI interface generates the expected internal calls.
// clone as proof of concept
//
// pattern:
// - least
// - each individual
// - most
// - unexpected

import * as command from "../src/command";
// Mine
import * as coreBranch from "../src/core-branch";
import * as coreClone from "../src/core-clone";
import * as coreForEach from "../src/core-for";
import * as coreInit from "../src/core-init";
import * as coreManifest from "../src/core-manifest";
import * as coreSnapshot from "../src/core-snapshot";


describe("clone cli", () => {
  const cloneSpy = jest.spyOn(coreClone, "doClone");

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
  const initSpy = jest.spyOn(coreInit, "doInit");

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

  test("init unexpected-param", () => {
    expect(() => {
      command.fab(["init", "unexpected-param"]);
    }).toThrow();
  });

});


describe("install cli", () => {
  const installSpy = jest.spyOn(coreClone, "doInstall");

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

  test("install unexpected-param", () => {
    expect(() => {
      command.fab(["install", "unexpected-param"]);
    }).toThrow();
  });

});


describe("for cli", () => {
  const forEachSpy = jest.spyOn(coreForEach, "doForEach");

  beforeAll(() => {
    forEachSpy.mockImplementation((cmd: string, args: string[], options: coreForEach.ForOptions) => {
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


describe("switch cli", () => {
  const switchSpy = jest.spyOn(coreBranch, "doSwitch");

  beforeAll(() => {
    switchSpy.mockImplementation((branchName: string) => {
      // do not call through
    });
  });

  afterAll(() => {
    switchSpy.mockRestore();
  });

  afterEach(() => {
    switchSpy.mockReset();
  });

  test("switch branch", () => {
    command.fab(["switch", "branch"]);
    expect(switchSpy).toHaveBeenCalledWith("branch");
  });

});


describe("make-branch cli", () => {
  const makeBranchSpy = jest.spyOn(coreBranch, "doMakeBranch");

  beforeAll(() => {
    makeBranchSpy.mockImplementation((branch: string, startPoint?: string, optionsParam?: coreBranch.MakeBranchOptions) => {
      // do not call through
    });
  });

  afterAll(() => {
    makeBranchSpy.mockRestore();
  });

  afterEach(() => {
    makeBranchSpy.mockReset();
  });

  // least
  test("make-branch branch", () => {
    command.fab(["make-branch", "branch"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", undefined, expect.objectContaining({ }));
    const options: coreBranch.MakeBranchOptions = makeBranchSpy.mock.calls[0][2];
    expect(options.publish).toBeUndefined();
  });

  test("make-branch branch start-point", () => {
    command.fab(["make-branch", "branch", "start-point"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", "start-point", expect.objectContaining({ }));
  });

  test("make-branch -p branch", () => {
    command.fab(["make-branch", "-p", "branch"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", undefined, expect.objectContaining({ publish: true }));
  });

  test("make-branch --publish branch", () => {
    command.fab(["make-branch", "--publish", "branch"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", undefined, expect.objectContaining({ publish: true }));
  });

  // most
  test("make-branch --publish branch start-point", () => {
    command.fab(["make-branch", "--publish", "branch", "start-point"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", "start-point", expect.objectContaining({ publish: true }));
  });

});


describe("snapshot cli", () => {
  const snapshotSpy = jest.spyOn(coreSnapshot, "doSnapshot");

  beforeAll(() => {
    snapshotSpy.mockImplementation((options: coreSnapshot.SnapshotOptions) => {
      // do not call through
    });
  });

  afterAll(() => {
    snapshotSpy.mockRestore();
  });

  afterEach(() => {
    snapshotSpy.mockReset();
  });

  // least
  test("snapshot", () => {
    command.fab(["snapshot"]);
    expect(snapshotSpy).toHaveBeenCalledWith(expect.objectContaining({ }));
    const options: coreSnapshot.SnapshotOptions = snapshotSpy.mock.calls[0][0];
    expect(options.output).toBeUndefined();
  });

  test("snapshot -o file", () => {
    command.fab(["snapshot", "-o", "file"]);
    expect(snapshotSpy).toHaveBeenCalledWith(expect.objectContaining({ output: "file" }));
  });

  test("snapshot --output file", () => {
    command.fab(["snapshot", "--output", "file"]);
    expect(snapshotSpy).toHaveBeenCalledWith(expect.objectContaining({ output: "file" }));
  });

  test("snapshot unexpected-param", () => {
    expect(() => {
      command.fab(["snapshot", "unexpected-param"]);
    }).toThrow();
  });

});


describe("recreate cli", () => {
  const recreateSpy = jest.spyOn(coreSnapshot, "doRecreate");

  beforeAll(() => {
    recreateSpy.mockImplementation((snapshotPath: string, destinationParam?: string) => {
      // do not call through
    });
  });

  afterAll(() => {
    recreateSpy.mockRestore();
  });

  afterEach(() => {
    recreateSpy.mockReset();
  });

  // least
  test("recreate snapshot", () => {
    command.fab(["recreate", "snapshot"]);
    expect(recreateSpy).toHaveBeenCalledWith("snapshot", undefined);
  });

  // most
  test("recreate snapshot destination", () => {
    command.fab(["recreate", "snapshot", "destinaton"]);
    expect(recreateSpy).toHaveBeenCalledWith("snapshot", "destinaton");
  });

});


describe("restore cli", () => {
  const restoreSpy = jest.spyOn(coreSnapshot, "doRestore");

  beforeAll(() => {
    restoreSpy.mockImplementation((snapshotPath?: string) => {
      // do not call through
    });
  });

  afterAll(() => {
    restoreSpy.mockRestore();
  });

  afterEach(() => {
    restoreSpy.mockReset();
  });

  // least
  test("restore", () => {
    command.fab(["restore"]);
    expect(restoreSpy).toHaveBeenCalledWith(undefined);
  });

  // most
  test("restore snapshot", () => {
    command.fab(["restore", "snapshot"]);
    expect(restoreSpy).toHaveBeenCalledWith("snapshot");
  });

});


describe("manifest cli", () => {
  const manifestSpy = jest.spyOn(coreManifest, "doManifest");

  beforeAll(() => {
    manifestSpy.mockImplementation((options: coreManifest.ManifestOptions) => {
      // do not call through
    });
  });

  afterAll(() => {
    manifestSpy.mockRestore();
  });

  afterEach(() => {
    manifestSpy.mockReset();
  });

  // least
  test("manifest", () => {
    command.fab(["manifest"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ }));
    const options: coreManifest.ManifestOptions = manifestSpy.mock.calls[0][0];
    expect(options.edit).toBeUndefined();
    expect(options.list).toBeUndefined();
    expect(options.add).toBeUndefined();
    expect(options.delete).toBeUndefined();
  });

  test("manifest -e", () => {
    command.fab(["manifest", "-e"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ edit: true }));
  });

  test("manifest --edit", () => {
    command.fab(["manifest", "--edit"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ edit: true }));
  });

  test("manifest -l", () => {
    command.fab(["manifest", "-l"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ list: true }));
  });

  test("manifest --list", () => {
    command.fab(["manifest", "--list"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ list: true }));
  });

  test("manifest -a", () => {
    command.fab(["manifest", "-a"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ add: true }));
  });

  test("manifest --add", () => {
    command.fab(["manifest", "--add"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ add: true }));
  });

  test("manifest --add depend", () => {
    command.fab(["manifest", "--add", "depend"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ add: "depend" }));
  });

  test("manifest -d", () => {
    command.fab(["manifest", "-d"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ delete: true }));
  });

  test("manifest --delete", () => {
    command.fab(["manifest", "--delete"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ delete: true }));
  });

  test("manifest --delete depend", () => {
    command.fab(["manifest", "--delete", "depend"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ delete: "depend" }));
  });

  test("manifest unexpected-param", () => {
    expect(() => {
      command.fab(["manifest", "unexpected-param"]);
    }).toThrow();
  });

});
