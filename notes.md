# arm

Got bit out of control trying to support both nested and siblings.

Want
* pull/pull -u
* master relative remote local in dependencies, like for .hgsub


Future Possibilities
* save/restore or freeze of whatever for reproducible working group state
* update
* fetch/pull
* add repo type check to dependency reading so do not need to warn in doStatus et al
* branchFoo for working with (remote) branches relative to working directory (a la hgh)
* id (ala hg)
* config edit (see git)
* separate leading command for config calls vs tree operations?
* origin#revision for git URLs, like Mercurial and github support (not sure of git details)
* typescript
* repo or personal preference for rebase vs merge et al
*   or, support pass-through flags for repo commands with -- if useful?
*   or, options for command
* unit tests
* configtest, like httpd -t. Check files read, and nestToRoot matches rootToNest

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
