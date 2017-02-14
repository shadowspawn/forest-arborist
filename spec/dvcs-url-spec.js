'use strict'; // eslint-disable-line strict

const dvcsUrl = require('../lib/dvcs-url');


describe('recognise git URL protocols', () => {
  const pathname = '/path/to/repo.git/';

  it('ssh', () => {
    // ssh://[user@]host.xz[:port]/path/to/repo.git/
    const variations = [
      'ssh://user@host.xz:123/path/to/repo.git/',
      'ssh://host.xz:123/path/to/repo.git/',
      'ssh://user@host.xz/path/to/repo.git/',
      'ssh://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('ssh:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('git', () => {
    // git://host.xz[:port]/path/to/repo.git/
    const variations = [
      'git://host.xz:123/path/to/repo.git/',
      'git://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('git:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('http', () => {
    // http[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      'http://host.xz:123/path/to/repo.git/',
      'http://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('http:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('https', () => {
    // http[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      'https://host.xz:123/path/to/repo.git/',
      'https://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('https:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('ftp', () => {
    // ftp[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      'ftp://host.xz:123/path/to/repo.git/',
      'ftp://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('ftp:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('ftps', () => {
    // ftp[s]://host.xz[:port]/path/to/repo.git/
    const variations = [
      'ftps://host.xz:123/path/to/repo.git/',
      'ftps://host.xz/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('ftps:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('file', () => {
    // file:///path/to/repo.git/
    const variations = [
      'file:///path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('file:');
      expect(parsed.pathname).toEqual(pathname);
    });
  });

  it('scp', () => {
    // [user@]host.xz:path/to/repo.git/
    const variations = [
      'user@host.xz:path/to/repo.git/',
      'host.xz:path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('scp');
      expect(parsed.pathname).toEqual('path/to/repo.git/');
    });
  });

  it('path-posix', () => {
    // /path/to/repo.git/
    const variations = [
      '/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('path-posix');
      expect(parsed.pathname).toEqual(pathname);
    });
  });
});


describe('recognise hg URL protocols', () => {
  const pathname = '/path/to/repo.git/';

  it('path-posix', () => {
    // /path/to/repo.git/
    const variations = [
      '/path/to/repo.git/',
    ];
    variations.forEach((url) => {
      const parsed = dvcsUrl.parse(url);
      expect(parsed.protocol).toEqual('path-posix');
      expect(parsed.pathname).toEqual(pathname);
    });
  });
});
