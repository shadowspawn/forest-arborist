# Forest Arborist

## Backlog

## Known Issues

- hg specific issues (low priority at moment)
    - if "hg pull" gets nothing then no need to call "hg update"
    - not auto-detecting pinned revision (could do it by detecting not on tip)
- tmp does not reliably cleanup when running jest?
    - Workaround: manual cleanup, set keep: true and call removeCallback explicitly

## Backlog Musing

- checklist for release
- refine testing strategies, focus on value not coverage

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
