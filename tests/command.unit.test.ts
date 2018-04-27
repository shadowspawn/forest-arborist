// Checking parsing the CLI interface generates the expected internal calls.
// clone as proof of concept

import * as command from "../src/command";
// Mine
import * as coreClone from "../src/core-clone";


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

  test("source", () => {
    command.fab(["clone", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ }));
    const options: coreClone.CloneOptions = cloneSpy.mock.calls[0][2];
    expect(options.branch).toBeUndefined();
    expect(options.manifest).toBeUndefined();
  });

  test("source destination", () => {
    command.fab(["clone", "source", "destination"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", "destination", expect.objectContaining({ }));
  });

  test("-b name source", () => {
    command.fab(["clone", "-b", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ branch: "name" }));
  });

  test("--branch name source", () => {
    command.fab(["clone", "--branch", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ branch: "name" }));
  });

  test("-m name source", () => {
    command.fab(["clone", "-m", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ manifest: "name" }));
  });

  test("--manifest name source", () => {
    command.fab(["clone", "--manifest", "name", "source"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", undefined, expect.objectContaining({ manifest: "name" }));
  });

  test("--branch branchName --manifest manifestName source destination", () => {
    command.fab(["clone", "--branch", "branchName", "--manifest", "manifestName", "source", "destination"]);
    expect(cloneSpy).toHaveBeenCalledWith("source", "destination", expect.objectContaining({ branch: "branchName", manifest: "manifestName" }));
  });

});
