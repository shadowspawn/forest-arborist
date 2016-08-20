# arm

Got bit out of control trying to support both nested and siblings.

Rationalise:
- arm.json needs to be at root of a repo (so we can find it for clone)
- arm.json needs to store rootFromNest for clone (so we can mark root in install)

arm-root:
init only creates if creates arm.json (so no reinit)
install creates if missing (since matches install feeling)
clone creates, possibly via install

Upcoming
* fetch/pull
* pull/pull -u
* update


Future Possibilities
* branchFoo for working with (remote) branches relative to working directory
* nest (like root)
* id (ala hg)
* config edit (see git)
* separate leading command for config calls vs tree operations?
* origin#revision for git URLs, like Mercurial and github support (not sure of git details)
* master relative remote local in dependencies, like for .hgsub
* typescript
* save/restore or freeze of whatever for reproducible working group state
* repo or personal preference for rebase vs merge et al
* or, support pass-through flags for repo commands with -- if useful?
* or, options for command
* unit tests
* config format test, like httpd -t

Terminology
* git
* Mercurial
* npm

## References

Using
* [command](https://www.npmjs.com/package/commander)
* [chalk](https://github.com/sindresorhus/chalk)

Developer
* [w3schools javascript](http://www.w3schools.com/js/default.asp)
* [node](https://nodejs.org/docs/latest/api/index.html)
* [node ES6 support](http://node.green)
* [Building command line tools with Node.js](https://developer.atlassian.com/blog/2015/11/scripting-with-node/) from Atlassian

Interesting
* [shelljs](http://documentup.com/arturadib/shelljs#command-reference)
* [async](http://caolan.github.io/async/)
* [defaults](https://www.npmjs.com/package/defaults)