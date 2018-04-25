import * as fs from "fs";
// Mine
import * as repo from "../src/repo";


test("getRepoTypeForLocalPath", () => {
  const spy = jest.spyOn(fs, "existsSync");

  spy.mockImplementation(() => {
    return false;
  });
  expect(() => {
    repo.getRepoTypeForLocalPath("notRepo");
  }).toThrowError();

  spy.mockImplementation((targetPath: string) => {
    return targetPath.indexOf(".git") != -1;
  });
  expect(repo.getRepoTypeForLocalPath("gitRepo")).toEqual("git");

  spy.mockImplementation((targetPath: string) => {
    return targetPath.indexOf(".hg") != -1;
  });
  expect(repo.getRepoTypeForLocalPath("hgRepo")).toEqual("hg");

  spy.mockRestore();
});


test("getRepoTypeForParams", () => {
  expect(repo.getRepoTypeForParams("dummyRepo", "git")).toBe("git");
  expect(repo.getRepoTypeForParams("dummyRepo", "hg")).toBe("hg");

  const spy = jest.spyOn(fs, "existsSync");
  spy.mockImplementation((targetPath: string) => {
    return targetPath.indexOf(".git") != -1;
  });
  expect(repo.getRepoTypeForParams("gitRepo")).toBe("git");

  spy.mockImplementation((targetPath) => {
    return targetPath.indexOf(".hg") != -1;
  });
  expect(repo.getRepoTypeForParams("hgRepo")).toBe("hg");

  spy.mockRestore();
});
