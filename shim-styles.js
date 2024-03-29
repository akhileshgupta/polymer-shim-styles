var fs = require('fs'),
    parse = require('css-parse'),
    stringify = require('css-stringify');

var shimRules = function(origRules) {

  // Rules array for the updated rules and comments
  var rules = [];

  for (var ruleIdx in origRules) {
    var rule = origRules[ruleIdx];

    if (rule.type === 'rule' && rule.selectors[0] !== '@font-face') {

      var selectors = [];
      var polyfillRuleSelectors = [];

      for (var idx in rule.selectors) {
        var selector = rule.selectors[idx];
        // No need for selector if the selector is body or html
        if (selector === 'body' || selector === 'html') {
          selector = ':host';
        } else {
          selector = (':host /deep/ ' + selector);
          selectors.push(selector.replace(':host /deep/', '::content'));
          selectors.push(selector.replace(':host /deep/', '::content>* /deep/'));
        }
        selectors.push(selector);
        polyfillRuleSelectors.push(selector);
      }
      rule.selectors = selectors;

      // Create polyfill rule declarations, starting with content property
      // Define a polyfill rule
      var polyfillRule = {
        type: 'rule',
        selectors: ['polyfill-next-selector'],
      };
      polyfillRule.declarations = [{
        type: "declaration",
        property: "content",
        value: ("'" + polyfillRuleSelectors + "'")
      }];

      // Replace the last comma and space from the comment
      //polyfillRule.comment = polyfillRule.comment.replace(/, $/, ' ');
      // Push polyfill comment and the updated rule
      rules.push(polyfillRule);
    }
    // If rule is a media query, then do a recursive shimming of its rules.
    else if (rule.type === 'media') {
      rule.rules = shimRules(rule.rules);
    }

    rules.push(rule);
  }

  return rules;
}

var shimStyles = function(file, dest) {
  console.log("parse CSS " + file);

  var css = fs.readFileSync(file, 'utf8');
  var json = parse(css);

  // Update the rules with shimmed version
  json.stylesheet.rules = shimRules(json.stylesheet.rules);

  console.log("writing CSS " + dest);
  fs.writeFileSync(dest, stringify(json));
}

module.exports = shimStyles;

// print process.argv
if (process.argv.length == 4) {
  shimStyles(process.argv[2], process.argv[3]);
}