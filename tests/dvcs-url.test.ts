import dvcsUrl = require("../src/dvcs-url");


describe("dvcs-url recognise git URL protocols", () => {
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
});


describe("dvcs-url recognise hg URL protocols", () => {
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
});


describe("dvcs-url windows", () => {
  test("parse", () => {
    const windowsPath = "C:\\Users\\me";
    const parsed = dvcsUrl.parse(windowsPath);
    expect(parsed.protocol).toEqual("path-win32");
    expect(parsed.pathname).toEqual(windowsPath);
  });

  test("repoName", () => {
    const windowsPath = "C:\\Users\\repo.git";
    const parsed = dvcsUrl.parse(windowsPath);
    expect(dvcsUrl.repoName(parsed)).toEqual("repo");
  });
});
