# A Github action that adds a comment to a PR

Checks size against budget and adds a comment.

Configure `identifier` to use this multiple times (i.e. for a monorepo).

## Inputs

| Name | Description | Type | Default |
| ---- | ----------- | -------- | ------- |
| budget | Size budget *bytes | number | |
| file | Filename of the message. Should be placed in `.github/workflows/` | file | |
| single_comment | Would you like to update the existing comment (if exists) instead of creating a new one every time? | no | true |
| identifier | Identifier that we put a comment in the comment so that we can identify them | no | `GITHUB_ACTION_COMMENT_PR` |

It's required to provide `message` or `file` input. If both are provided `message` input will be used.

## Usage

### Format cmment via file
```yaml
uses: ...this package
with:
  file: "pr-size-change-comment.md"
env:
  GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

The file should be placed in `.github/workflows` and it should be `.md`.

## LICENSE

MIT