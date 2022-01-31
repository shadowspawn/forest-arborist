import * as process from "process";
// Mine
import * as dvcsUrl from "../src/dvcs-url";
import * as util from "../src/util";


describe("dvcs-url parse recognises git URL protocols", () => {
  const pathname = "/path/to/repo.git/";

  test("git ssh", () => {
    // ssh://[user@]host.xz[:port]/path/to/repo.git/
    const variations = [
      "ssh://user@host.xz:123/path/to/repo.git/",
      "ssh://host.xz:123/path/to/repo.git/",
      "ssh://user@host.xz/path/to/repo.git/",
      "ssh://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("ssh:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git", () => {
    // git://host.xz[:port]/path/to/repo.git/
    const variations = [
      "git://host.xz:123/path/to/repo.git/",
      "git://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("git:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git http", () => {
    // http[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      "http://host.xz:123/path/to/repo.git/",
      "http://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("http:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git https", () => {
    // http[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      "https://host.xz:123/path/to/repo.git/",
      "https://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("https:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git ftp", () => {
    // ftp[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      "ftp://host.xz:123/path/to/repo.git/",
      "ftp://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("ftp:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git ftps", () => {
    // ftp[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      "ftps://host.xz:123/path/to/repo.git/",
      "ftps://host.xz/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("ftps:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git file", () => {
    // file:///path/to/repo.git/
    const variations = [
      "file:///path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("file:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git scp", () => {
    // [user@]host.xz:path/to/repo.git/
    const variations = [
      "user@host.xz:path/to/repo.git/",
      "host.xz:path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("scp");
      expect(parsed.pathname).toEqual("path/to/repo.git/");
    });
  });

  test("git path-posix", () => {
    // /path/to/repo.git/
    const variations = [
      "/path/to/repo.git/",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("path-posix");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("git path-win32", () => {
    util.setPlatformForTest("win32");
    const windowsPath = "C:\\Users\\repo";
    const parsed = dvcsUrl.parse(windowsPath);
    expect(parsed.protocol).toEqual("path-win32");
    expect(parsed.pathname).toEqual(windowsPath);
    util.setPlatformForTest(process.platform);
  });
});


describe("dvcs-url parse recognises hg URL protocols", () => {
  const pathname = "/path/to/repo";

  // These are a subset of the git URLs apart from the #revision,
  // and optional [path], and we are ignoring both until needed.

  test("hg ssh", () => {
    // ssh://[user@]host[:port]/[path][#revision]
    const variations = [
      "ssh://user@host:123/path/to/repo",
      "ssh://host:123/path/to/repo",
      "ssh://user@host/path/to/repo",
      "ssh://host/path/to/repo",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("ssh:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("hg http", () => {
    // http://[user[:pass]@]host[:port]/[path][#revision]
    // Add test for
    const variations = [
      "http://user:pass@host:123/path/to/repo",
      "http://host:123/path/to/repo",
      "http://user@host/path/to/repo",
      "http://user:pass@host/path/to/repo",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("http:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("hg https", () => {
    // http://[user[:pass]@]host[:port]/[path][#revision]
    // (Is path really optional?))
    const variations = [
      "https://user:pass@host:123/path/to/repo",
      "https://host:123/path/to/repo",
      "https://user@host/path/to/repo",
      "https://user:pass@host/path/to/repo",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("https:");
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  test("hg path-posix", () => {
    // local/filesystem/path[#revision]
    const variations = [
      "local/filesystem/path",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("path-posix");
      expect(parsed.pathname).toEqual("local/filesystem/path");
    });
  });

  test("hg file", () => {
    // file://local/filesystem/path[#revision]
    // Urk, strips the local unless we have three slashes!
    // Perhaps partial not supported by url?
    const variations = [
      "file:///local/filesystem/path",
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual("file:");
      expect(parsed.pathname).toEqual("/local/filesystem/path");
    });
  });
});


describe("dvcs-url resolve", () => {
  test("ssh-like protocols", () => {
    // Most of the protocols look like ssh
    const base = "ssh://user@host:123/path/to/repo";
    const parsedBase = dvcsUrl.parse(base);
    const result = dvcsUrl.resolve(parsedBase, "../other");
    expect(result).toEqual("ssh://user@host:123/path/to/other");
  });

  test("file protocol", () => {
    const base = "file:///path/to/repo.git/";
    const parsedBase = dvcsUrl.parse(base);
    const result = dvcsUrl.resolve(parsedBase, "../other.git");
    expect(result).toEqual("file:///path/to/other.git");
  });

  test("custom scp protocol", () => {
    const base = "user@host.xz:path/to/repo.git/";
    const parsedBase = dvcsUrl.parse(base);
    const result = dvcsUrl.resolve(parsedBase, "../other.git");
    expect(result).toEqual("user@host.xz:path/to/other.git");
  });

  test("custom path-posix protocol", () => {
    const base = "/path/to/repo.git/";
    const parsedBase = dvcsUrl.parse(base);
    const result = dvcsUrl.resolve(parsedBase, "../other.git");
    expect(result).toEqual("/path/to/other.git");
  });

  test("win32 protocol", () => {
    util.setPlatformForTest("win32");
    const base = "C:\\Users\\repo.git";
    const parsedBase = dvcsUrl.parse(base);
    const result = dvcsUrl.resolve(parsedBase, "../other.git");
    expect(result).toEqual("C:\\Users\\other.git");
    util.setPlatformForTest(process.platform);
  });
});


test("parse undefined", () => {
  expect(dvcsUrl.parse()).toEqual({ protocol: "", pathname: "" });
});


test("sameDir", () => {
  // Not exhaustive!
  // Different protocol
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("ssh://host.xz/path1"),
    dvcsUrl.parse("user@host.xz:path1")
  )).toBe(false);
  // Different host
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("ssh://host.xz1/path1"),
    dvcsUrl.parse("ssh://host.xz2/path2")
  )).toBe(false);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("user@host.xz1:path1"),
    dvcsUrl.parse("user@host.xz2:path1")
  )).toBe(false);
  // Different dir
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("ssh://host.xz1/a/path1"),
    dvcsUrl.parse("ssh://host.xz2/b/path1")
  )).toBe(false);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("user@host.xz1:a/path1"),
    dvcsUrl.parse("user@host.xz2:b/path1")
  )).toBe(false);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("a/path1"),
    dvcsUrl.parse("b/path1")
  )).toBe(false);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("a\\path1"),
    dvcsUrl.parse("b\\path1")
  )).toBe(false);
  // same protocol and (parent) dir
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("ssh://host.xz/path1"),
    dvcsUrl.parse("ssh://host.xz/path2")
  )).toBe(true);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("ssh://host.xz/a/path1"),
    dvcsUrl.parse("ssh://host.xz/a/path2")
  )).toBe(true);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("git://host.xz/path1"),
    dvcsUrl.parse("git://host.xz/path2")
  )).toBe(true);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("user@host.xz2:a/path1"),
    dvcsUrl.parse("user@host.xz2:a/path2")
  )).toBe(true);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("a/path1"),
    dvcsUrl.parse("a/path2")
  )).toBe(true);
  expect(dvcsUrl.sameDir(
    dvcsUrl.parse("a\\path1"),
    dvcsUrl.parse("a\\path2")
  )).toBe(true);
});


test("repoName", () => {
  expect(dvcsUrl.repoName(dvcsUrl.parse("ssh://user@host.xz:123/path/to/repo"))).toBe("repo");
  expect(dvcsUrl.repoName(dvcsUrl.parse("ssh://user@host.xz:123/path/to/repo.git"))).toBe("repo");
  expect(dvcsUrl.repoName(dvcsUrl.parse("user@host.xz2:a/repo"))).toBe("repo");
  expect(dvcsUrl.repoName(dvcsUrl.parse("user@host.xz2:a/repo.git"))).toBe("repo");
  expect(dvcsUrl.repoName(dvcsUrl.parse("a/b/c/repo"))).toBe("repo");
  expect(dvcsUrl.repoName(dvcsUrl.parse("a\\b\\c\\repo"))).toBe("repo");
});


test("relative", () => {
  expect(dvcsUrl.relative(
    dvcsUrl.parse("ssh://user@host.xz:123/path/a"),
    dvcsUrl.parse("ssh://user@host.xz:123/path/b")
  )).toBe("../b");
  expect(dvcsUrl.relative(
    dvcsUrl.parse("user@host.xz2:path/a"),
    dvcsUrl.parse("user@host.xz2:path/b")
  )).toBe("../b");
  expect(dvcsUrl.relative(
    dvcsUrl.parse("/path/a"),
    dvcsUrl.parse("/path/b")
  )).toBe("../b");

  util.setPlatformForTest("win32");
  expect(dvcsUrl.relative(
    dvcsUrl.parse("C:\\Users\\a"),
    dvcsUrl.parse("C:\\Users\\b")
  )).toBe("../b");
  util.setPlatformForTest(process.platform);
});


test("isRelativePath", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(dvcsUrl.isRelativePath(null as any)).toBe(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(dvcsUrl.isRelativePath(undefined as any)).toBe(false);
  expect(dvcsUrl.isRelativePath("")).toBe(false);
  expect(dvcsUrl.isRelativePath("a")).toBe(false);
  expect(dvcsUrl.isRelativePath("a/b")).toBe(false);
  expect(dvcsUrl.isRelativePath("a/../b")).toBe(false);
  expect(dvcsUrl.isRelativePath("/")).toBe(false);
  expect(dvcsUrl.isRelativePath("/absolute")).toBe(false);
  expect(dvcsUrl.isRelativePath("./relative")).toBe(true);
  expect(dvcsUrl.isRelativePath("../relative")).toBe(true);
});
