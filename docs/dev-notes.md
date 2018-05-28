# Forest Arborist

## Backlog

## Known Issues

- tmp does not reliably cleanup when running jest?
    - Workaround: manual cleanup, set keep: true and call removeCallback explicitly
- `fab manifest` would be nicer with subcommands rather than options

## Backlog Musing

## Patterns

Version Plan

- Use different versions on master (published) and develop (linked work in progress).
- Tag version on master to match the published version.
- Do not tag version on develop since changes. Use prerelease on develop.
- See release command, which follows `np` style steps to prepare and check and release a version to npm and github.

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
