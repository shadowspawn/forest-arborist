# Forest Arborist

## Backlog
* typescript
 * convert command from js to ts
 * prepublish script, tsc! test?
 * does prepublish get run by install or link, so do developers need to explicitly tsc if do above?
 * turn on strictNullChecks ?
 * move command to src, or leave at root? Root so entry point obvious and is different?
 * rename command back to fab?
 * drop eslint?!
 * pre-git check that no focused tests? Or just wing it...
 * use jsonfile for writing too
 * move jasmine.json into spec folder
 * insight, commander-spec tests installed command, run alone somehow?
  * test publish, npm install . -g
 * code declare full strongly typed interface for manifest (used in init and readmanifest)
  * likewise for root file
  * likewise for snapshot file

## Known Issues
* hg specific issues (low priority at moment)
 * "hg push" returns status 1 so breaks for-each
 * if "hg pull" gets nothing then no need to call "hg update"
 * not auto-detecting pinned revision (could do it by detecting not on tip)
* Say goodbye to simple bisect, not storing state. Sadly this is By Design!
* using colours for logging errors and commands, but clashes with some terminal colours!
* flat gitlab layout means might default to a lot of relative repos, review init behaviour if necessary.
* no warning about excess arguments passed to command (not supported by commander and work-arounds proved fragile)

## Backlog Musing
* switch and make-branch need to do main before reading manifest, dependencies could change free/locked/pinned
* Test before operations on forest which break if changes in repo do not get half way?
 * http://unix.stackexchange.com/questions/155046/determine-if-git-working-directory-is-clean-from-a-script
* typescript
* for-each --keep-going (like make) for ignoring result code of commands which might return non-zero, like hg push ?
* init --interactive, to prompt for free/locked/pinned and relative/absolute ?
* delete the old version tags from github when go to version 1

## Patterns

Version Plan
* Use different versions on master (published) and develop (linked work in progress).
* Tag version on master to match the published version.
* Do not tag version on develop since changes.
* See copy-up and copy-down run commands.

Terminology Inspirations
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
* [omnipath](https://www.npmjs.com/package/omnipath) for transparent consistent handling of paths and urls

git-flow equivalent git commands
* https://gist.github.com/JamesMGreene/cdd0ac49f90c987e45ac

Other Approaches
* git submodules
* git subtree
* (google) repo
* braid
* gits (git slave)
* mr (multiple repositories)
