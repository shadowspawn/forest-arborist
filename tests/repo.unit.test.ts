// See also repo.ini.test.ts for integration tests.

import * as fs from "fs";
// Mine
import * as repo from "../src/repo";


test("getRepoTypeForLocalPath", () => {
  const spy = jest.spyOn(fs, "existsSync");

  spy.mockReturnValue(false);
  expect(() => {
    repo.getRepoTypeForLocalPath("notRepo");
  }).toThrowError();

  spy.mockImplementation((targetPath: fs.PathLike) => {
    return (typeof targetPath === "string") && (targetPath.indexOf(".git") != -1);
  });
  expect(repo.getRepoTypeForLocalPath("gitRepo")).toEqual("git");

  spy.mockImplementation((targetPath: fs.PathLike) => {
    return (typeof targetPath === "string") && (targetPath.indexOf(".hg") != -1);
  });
  expect(repo.getRepoTypeForLocalPath("hgRepo")).toEqual("hg");

  spy.mockRestore();
});


test("getRepoTypeForParams", () => {
  expect(repo.getRepoTypeForParams("dummyRepo", "git")).toBe("git");
  expect(repo.getRepoTypeForParams("dummyRepo", "hg")).toBe("hg");

  const spy = jest.spyOn(fs, "existsSync");
  spy.mockImplementation((targetPath: fs.PathLike) => {
    return (typeof targetPath === "string") && (targetPath.indexOf(".git") != -1);
  });
  expect(repo.getRepoTypeForParams("gitRepo")).toBe("git");

  spy.mockImplementation((targetPath) => {
    return (typeof targetPath === "string") && (targetPath.indexOf(".hg") != -1);
  });
  expect(repo.getRepoTypeForParams("hgRepo")).toBe("hg");

  spy.mockRestore();
});
