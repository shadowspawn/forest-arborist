# arm

Next
* script for merging develop into master, bump version, push, npm publish
  * sanity checks, lint, dependencies
  * copy-up: checkout master, merge develop
  * npm version patch
  * deploy: npm publish, git push
* foreach
* snapshot


Future Possibilities
* save/restore or freeze of whatever for reproducible working group state [snapshot?]
* branching workflows, when they evolve?!
*   e.g. forest master/develop ?
*   multiple control files, e.g. HRVMasterStable ?
* something to check for merges already in progress etc, check, pure expectedProtocols
* is short status too short, use longer status by default? See how goes.
* update
* hg only workflows
*   branchIncoming for working with (remote) branches relative to working directory (a la hgh)
*   master relative origin in dependencies
*   use .hgsub like .arm-root automatically (needs relative repo support)
* id (ala hg) [snapshot?]
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
