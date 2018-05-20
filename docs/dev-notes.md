# Forest Arborist

## Backlog

## Known Issues

- tmp does not reliably cleanup when running jest?
    - Workaround: manual cleanup, set keep: true and call removeCallback explicitly
- `fab manifest` would be nicer with subcommands rather than options

## Backlog Musing

- detect hg pinned revision
- checklist for release. Automate

- publish-dry-run test. Use playground. Just testing clone would be good start. Easy to extend to other commands.

## Patterns

Version Plan

- Use different versions on master (published) and develop (linked work in progress).
- Tag version on master to match the published version.
- Do not tag version on develop since changes. Use prerelease on develop.
- See copy-up and copy-down run commands.

Terminology Inspirations

- git
- Mercurial
- npm

## Other Approaches

- git submodules
- git subtree
- (google) repo
- braid
- gits (git slave)
- mr (multiple repositories)
