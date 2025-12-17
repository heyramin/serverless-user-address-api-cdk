{
  "default": {
    "require": ["tests/bdd/steps/**/*.ts"],
    "requireModule": ["ts-node/register"],
    "format": ["progress-bar", "html:cucumber-report.html"],
    "formatOptions": {
      "snippetInterface": "async-await"
    }
  }
}
