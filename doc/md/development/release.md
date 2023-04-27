# Making a Release

Making a DataVis release isn't particularly hard, but it does require a few steps.

1. Make sure all changes that will be in the release are committed on the appropriate branch.
2. Update the `package.json` file to update the version field.
3. Commit just the `package.json` change with the commit note "Rel: DataVis v{VERSION}".
4. Create a tag called "v{VERSION}" with the note "DataVis v{VERSION}".
5. Push the commits and the tag.
