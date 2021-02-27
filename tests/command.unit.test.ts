// Test parsing the CLI interface generates the expected internal calls:
// - CLI is backwards compatible
// - can use typed internal interface for other tests, CLI covered
//
// pattern:
// - simplest call
// - individual option and argument variations
// - most complex call
// - other tests

import * as command from "../src/command";
// Mine
import * as completion from "../src/completion";
import * as coreBranch from "../src/core-branch";
import * as coreClone from "../src/core-clone";
import * as coreForEach from "../src/core-for";
import * as coreInit from "../src/core-init";
import * as coreManifest from "../src/core-manifest";
import * as corePull from "../src/core-pull";
import * as coreSnapshot from "../src/core-snapshot";


describe("clone cli", () => {
  let cloneSpy: jest.SpyInstance;

  beforeAll(() => {
    cloneSpy = jest.spyOn(coreClone, "doClone");
    cloneSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    cloneSpy.mockRestore();
  });

  beforeEach(() => {
    cloneSpy.mockClear();
  });

  // simplest
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

  // most complex
  test("clone --branch branchName --manifest manifestName source destination", () => {
    command.fab(["clone", "--branch", "branchName", "--manifest", "manifestName", "source", "destination"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", "destination", expect.objectContaining({ branch: "branchName", manifest: "manifestName" }));
  });

});


describe("init cli", () => {
  let initSpy: jest.SpyInstance;

  beforeAll(() => {
    initSpy = jest.spyOn(coreInit, "doInit");
    initSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    initSpy.mockRestore();
  });

  beforeEach(() => {
    initSpy.mockClear();
  });

  // failures, insufficent or excess parameters

  test("init missing parameters", () => {
    expect(() => {
      command.fab(["init"]);
    }).toThrow();
  });

  test("init excess parameters", () => {
    expect(() => {
      command.fab(["init", "--nested", "--sibling"]);
    }).toThrow();
  });

  test("init excess parameters", () => {
    expect(() => {
      command.fab(["init", "--nested", "--root", "."]);
    }).toThrow();
  });

  test("init excess parameters", () => {
    expect(() => {
      command.fab(["init",  "--sibling", "--root", ".."]);
    }).toThrow();
  });

  // simple
  test("init --root ..", () => {
    command.fab(["init", "--root", ".."]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ root: ".." }));
    const options: coreInit.InitOptions = initSpy.mock.calls[0][0];
    expect(options.manifest).toBeUndefined();
  });

  test("init --nested", () => {
    command.fab(["init", "--nested"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ root: "." }));
  });

  test("init --sibling", () => {
    command.fab(["init", "--sibling"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ root: ".." }));
  });

  test("init --sibling -m name", () => {
    command.fab(["init", "--sibling", "-m", "name"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

  test("init --sibling --manifest name", () => {
    command.fab(["init", "--sibling","--manifest", "name"]);
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: "name" }));
  });

  test("init --sibling unexpected-param", () => {
    expect(() => {
      command.fab(["init", "--sibling", "unexpected-param"], { suppressOutput: true });
    }).toThrow();
  });

});


describe("install cli", () => {
  let installSpy: jest.SpyInstance;

  beforeAll(() => {
    installSpy = jest.spyOn(coreClone, "doInstall");
    installSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    installSpy.mockRestore();
  });

  beforeEach(() => {
    installSpy.mockClear();
  });

  // simplest
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
      command.fab(["install", "unexpected-param"], { suppressOutput: true });
    }).toThrow();
  });

});


describe("for-each cli", () => {
  let forEachSpy: jest.SpyInstance;

  beforeAll(() => {
    forEachSpy = jest.spyOn(coreForEach, "doForEach");
    forEachSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    forEachSpy.mockRestore();
  });

  beforeEach(() => {
    forEachSpy.mockClear();
  });

  // simplest
  test("for-each command", () => {
    command.fab(["for-each", "command"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ }));
    const options: coreForEach.ForOptions = forEachSpy.mock.calls[0][2];
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

  // pass-through options
  test("for-each --keepgoing command --option argument", () => {
    command.fab(["for-each", "--keepgoing", "command", "--option", "argument"]);
    expect(forEachSpy).toHaveBeenCalledWith("command", ["--option", "argument"], expect.objectContaining({ keepgoing: true }));
  });

});


describe("for-free cli", () => {
  let forFreeSpy: jest.SpyInstance;

  beforeAll(() => {
    forFreeSpy = jest.spyOn(coreForEach, "doForFree");
    forFreeSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    forFreeSpy.mockRestore();
  });

  beforeEach(() => {
    forFreeSpy.mockClear();
  });

  // simplest
  test("for-free command", () => {
    command.fab(["for-free", "command"]);
    expect(forFreeSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ }));
    const options: coreForEach.ForOptions = forFreeSpy.mock.calls[0][2];
    expect(options.keepgoing).toBeUndefined();
  });

  test("for-free -k command", () => {
    command.fab(["for-free", "-k", "command"]);
    expect(forFreeSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ keepgoing: true }));
  });

  test("for-free --keepgoing command", () => {
    command.fab(["for-free", "--keepgoing", "command"]);
    expect(forFreeSpy).toHaveBeenCalledWith("command", [], expect.objectContaining({ keepgoing: true }));
  });

  // pass-through options
  test("for-free --keepgoing command --option argument", () => {
    command.fab(["for-free", "--keepgoing", "command", "--option", "argument"]);
    expect(forFreeSpy).toHaveBeenCalledWith("command", ["--option", "argument"], expect.objectContaining({ keepgoing: true }));
  });

});


describe("git (for)", () => {
  let forGitSpy: jest.SpyInstance;

  beforeAll(() => {
    forGitSpy = jest.spyOn(coreForEach, "doForGit");
    forGitSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    forGitSpy.mockRestore();
  });

  beforeEach(() => {
    forGitSpy.mockClear();
  });

  // simplest
  test("git command", () => {
    command.fab(["git", "command"]);
    expect(forGitSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ }));
    const options: coreForEach.ForOptions = forGitSpy.mock.calls[0][1];
    expect(options.keepgoing).toBeUndefined();
  });

  test("git -k command", () => {
    command.fab(["git", "-k", "command"]);
    expect(forGitSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ keepgoing: true }));
  });

  test("git --keepgoing command", () => {
    command.fab(["git", "--keepgoing", "command"]);
    expect(forGitSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ keepgoing: true }));
  });

  // pass-through options
  test("git --keepgoing command --option argument", () => {
    command.fab(["git", "--keepgoing", "command", "--option", "argument"]);
    expect(forGitSpy).toHaveBeenCalledWith(["command", "--option", "argument"], expect.objectContaining({ keepgoing: true }));
  });

});


describe("hg (for)", () => {
  let forHgSpy: jest.SpyInstance;

  beforeAll(() => {
    forHgSpy = jest.spyOn(coreForEach, "doForHg");
    forHgSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    forHgSpy.mockRestore();
  });

  beforeEach(() => {
    forHgSpy.mockClear();
  });

  // simplest
  test("hg command", () => {
    command.fab(["hg", "command"]);
    expect(forHgSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ }));
    const options: coreForEach.ForOptions = forHgSpy.mock.calls[0][1];
    expect(options.keepgoing).toBeUndefined();
  });

  test("hg -k command", () => {
    command.fab(["hg", "-k", "command"]);
    expect(forHgSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ keepgoing: true }));
  });

  test("hg --keepgoing command", () => {
    command.fab(["hg", "--keepgoing", "command"]);
    expect(forHgSpy).toHaveBeenCalledWith(["command"], expect.objectContaining({ keepgoing: true }));
  });

  // pass-through options
  test("hg --keepgoing command --option argument", () => {
    command.fab(["hg", "--keepgoing", "command", "--option", "argument"]);
    expect(forHgSpy).toHaveBeenCalledWith(["command", "--option", "argument"], expect.objectContaining({ keepgoing: true }));
  });

});


describe("switch cli", () => {
  let switchSpy: jest.SpyInstance;

  beforeAll(() => {
    switchSpy = jest.spyOn(coreBranch, "doSwitch");
    switchSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    switchSpy.mockRestore();
  });

  beforeEach(() => {
    switchSpy.mockClear();
  });

  // simplest
  test("switch branch", () => {
    command.fab(["switch", "branch"]);
    expect(switchSpy).toHaveBeenCalledWith("branch");
  });

});


describe("make-branch cli", () => {
  let makeBranchSpy: jest.SpyInstance;

  beforeAll(() => {
    makeBranchSpy = jest.spyOn(coreBranch, "doMakeBranch");
    makeBranchSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    makeBranchSpy.mockRestore();
  });

  beforeEach(() => {
    makeBranchSpy.mockClear();
  });

  // simplest
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

  // most complex
  test("make-branch --publish branch start-point", () => {
    command.fab(["make-branch", "--publish", "branch", "start-point"]);
    expect(makeBranchSpy).toHaveBeenCalledWith("branch", "start-point", expect.objectContaining({ publish: true }));
  });

});


describe("snapshot cli", () => {
  let snapshotSpy: jest.SpyInstance;

  beforeAll(() => {
    snapshotSpy = jest.spyOn(coreSnapshot, "doSnapshot");
    snapshotSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    snapshotSpy.mockRestore();
  });

  beforeEach(() => {
    snapshotSpy.mockClear();
  });

  // simplest
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
      command.fab(["snapshot", "unexpected-param"], { suppressOutput: true });
    }).toThrow();
  });

});


describe("recreate cli", () => {
  let recreateSpy: jest.SpyInstance;

  beforeAll(() => {
    recreateSpy = jest.spyOn(coreSnapshot, "doRecreate");
    recreateSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    recreateSpy.mockRestore();
  });

  beforeEach(() => {
    recreateSpy.mockClear();
  });

  // simplest
  test("recreate snapshot", () => {
    command.fab(["recreate", "snapshot"]);
    expect(recreateSpy).toHaveBeenCalledWith("snapshot", undefined);
  });

  test("recreate snapshot destination", () => {
    command.fab(["recreate", "snapshot", "destinaton"]);
    expect(recreateSpy).toHaveBeenCalledWith("snapshot", "destinaton");
  });

});


describe("restore cli", () => {
  let restoreSpy: jest.SpyInstance;

  beforeAll(() => {
    restoreSpy = jest.spyOn(coreSnapshot, "doRestore");
    restoreSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    restoreSpy.mockRestore();
  });

  beforeEach(() => {
    restoreSpy.mockClear();
  });

  // simplest
  test("restore", () => {
    command.fab(["restore"]);
    expect(restoreSpy).toHaveBeenCalledWith(undefined);
  });

  test("restore snapshot", () => {
    command.fab(["restore", "snapshot"]);
    expect(restoreSpy).toHaveBeenCalledWith("snapshot");
  });

});


describe("manifest cli", () => {
  let manifestSpy: jest.SpyInstance;

  beforeAll(() => {
    manifestSpy = jest.spyOn(coreManifest, "doManifest");
    manifestSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    manifestSpy.mockRestore();
  });

  beforeEach(() => {
    manifestSpy.mockClear();
  });

  test("manifest edit", () => {
    command.fab(["manifest", "edit"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ edit: true }));
  });

  test("manifest list", () => {
    command.fab(["manifest", "list"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ list: true }));
  });

  test("manifest add", () => {
    command.fab(["manifest", "add"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ add: true }));
  });

  test("manifest add depend", () => {
    command.fab(["manifest", "add", "depend"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ add: "depend" }));
  });

  test("manifest delete", () => {
    command.fab(["manifest", "delete"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ delete: true }));
  });

  test("manifest delete depend", () => {
    command.fab(["manifest", "delete", "depend"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ delete: "depend" }));
  });

  test("manifest path", () => {
    command.fab(["manifest", "path"]);
    expect(manifestSpy).toHaveBeenCalledWith(expect.objectContaining({ }));
  });

  test("manifest unexpected-command", () => {
    expect(() => {
      command.fab(["manifest", "unexpected-command"], { suppressOutput: true });
    }).toThrow();
  });

});


describe("pull cli", () => {
  let pullSpy: jest.SpyInstance;

  beforeAll(() => {
    pullSpy = jest.spyOn(corePull, "doPull");
    pullSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    pullSpy.mockRestore();
  });

  beforeEach(() => {
    pullSpy.mockClear();
  });

  test("pull", () => {
    command.fab(["pull"]);
    expect(pullSpy).toHaveBeenCalledWith();
  });

  test("pull unexpected-param", () => {
    expect(() => {
      command.fab(["pull", "unexpected-param"], { suppressOutput: true });
    }).toThrow();
  });

});


describe("completion cli", () => {
  let completionSpy: jest.SpyInstance;

  beforeAll(() => {
    completionSpy = jest.spyOn(completion, "completion");
    completionSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    completionSpy.mockRestore();
  });

  beforeEach(() => {
    completionSpy.mockClear();
  });

  test("completion", () => {
    command.fab(["completion"]);
    expect(completionSpy).toHaveBeenCalledTimes(1);
  });

  test("completion -- fab swit", () => {
    command.fab(["completion"]);
    expect(completionSpy).toHaveBeenCalledTimes(1);
  });

});


describe("unknown-command cli", () => {

  test("unknown-command", () => {
    expect(() => {
      command.fab(["unknown-command"], { suppressOutput: true });
    }).toThrow();
  });

});
