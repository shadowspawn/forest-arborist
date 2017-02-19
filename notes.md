# Forest Arborist

## Backlog
* Add support for manifest ([user supplied]\_manifest.json) to
 * root file
 * init
 * clone
 * install
* "fab restore -" for getting out of snapshot? reminder, git has -b @{-1}
* switch and make-branch need to do main before reading manifest, dependencies could change
* take branch off install and always match main for free repos? (Or need to do main before read manifest)
* Start writing nice help

## jasmine Issues
(clean)

## Known Issues
* local origin on Windows probably not working (need support for Windows path in multiple places)
* hg specific issues (low priority at moment)
 * "hg push" returns status 1 so breaks for-each
 * if "hg pull" gets nothing then no need to call "hg update"
 * not auto-detecting pinned revision (could do it by detecting not on tip)
* Say goodbye to simple bisect, not storing state. Sadly this is By Design!
* using colours for logging errors and commands, but clashes with some terminal colours!
* flat gitlab layout means might default to a lot of relative repos, review init behaviour if necessary.
* no warning about excess arguments passed to command (not supported by commander and work-arounds proved fragile)

## Backlog Musing
* unit tests (nested operations, sibling operations, pin/lock/free)
* Test before operations on forest which break if changes in repo do not get half way?
 * http://unix.stackexchange.com/questions/155046/determine-if-git-working-directory-is-clean-from-a-script
* multiple manifest files, e.g. HRVMasterStable ?
  * move manifest to .arm folder?
  * manifest list
  * handle clone with no default manifest and no manifest specified, list manifests
* typescript
* for-fun
 * --pinned --locked --free --all
 * --git --hg (default to all, but supports mixed repo types!). Nah.
 * git X == for-fun git
 * hg X == for-fun hg
* for-foo --ignore or similar for ignoring result code of commands which fail when null, like hg push ?
* help for modifying dependencies in manifest?
  * add/remove
  * pin/lock/free/auto
  * relative/absolute (rarer!)
  * see gitslave and gitsubmodule and npm for examples of command support
* restore could reset dangling repos to null revision
* install could do fetch for pinned revisions (in case has changed)
* install could do pull for existing repos
* install should switch branch on main before reading manifest when changing branch
* Add tip to ignore when add root file to repo if not root file not ignored (git check-ignore)
* summary could show manifest, root, main, dependencies (abs/rel, pinned, locked, free)

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
