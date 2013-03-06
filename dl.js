function answerQuery(facts, rules, query) {
  return evalQuery(buildDatabase(facts, rules), query);
}

function evalQuery(facts, query) {
  var matchingFacts = _.filter(facts, _.partial(unify, query));
  return _.map(matchingFacts, _.partial(asBinding, query));
}

function unify(query, fact) {
  return _.every(_.zip(query, fact), function(pair) {
    return pair[0] == pair[1] || isVariable(pair[0]) || isVariable(pair[1]);
  });
}

function isVariable(identifier) {
  return identifier[0].toUpperCase() == identifier[0]
}

function asBinding(query, fact) {
  return _.pick(_.object(query, fact), _.filter(query, isVariable));
}

function buildDatabase(facts, rules) {
  var newFacts = _.reduce(rules, addRule, facts);
  if (facts.length == newFacts.length) {
    return facts;
  } else {
    return buildDatabase(newFacts, rules);
  }
}

function addRule(facts, rule) {
  var newFacts = _.union(facts, ruleAsFacts(facts, rule));
  return _.uniq(newFacts, false, JSON.stringify);
}

function ruleAsFacts(facts, rule) {
  var allPossibleBindings = generateBindings(facts, rule);
  return _.map(allPossibleBindings, _.partial(substitute, rule[0]))
}

function generateBindings(facts, rule) {
  var goals = _.map(_.rest(rule), _.partial(evalQuery, facts));
  return _.reduce(_.rest(goals), unifyBindingArrays, _.first(goals));
}

function unifyBindingArrays(arr1, arr2) {
  return _.flatten(_.map(arr1, function(bindings) {
    return _.compact(_.map(arr2, _.partial(unifyBindings, bindings)))
  }))
}

function unifyBindings(bindings1, bindings2) {
  var joined = _.defaults(_.clone(bindings1), bindings2);
  if (_.isEqual(joined, _.extend(_.clone(bindings1), bindings2))) {
    return joined;
  }
}

function unifyVar(bindings, identifier) {
  if (isVariable(identifier)) {
    return bindings[identifier] || identifier;
  } else {
    return identifier;
  }
}

function substitute(term, bindings) {
  return _.map(term, _.partial(unifyVar, bindings));
}

var facts = [
  ["parent", "alice", "bob"],
  ["parent", "alice", "bill"],
  ["parent", "bob", "carol"],
  ["parent", "carol", "dennis"],
  ["parent", "carol", "david"]
]

var rules = [
  [["ancestor", "X", "Y"], ["parent", "X", "Y"]],
  [["ancestor", "X", "Y"], ["ancestor", "X", "Z"],
                           ["ancestor", "Z", "Y"]]
]

function assertQuery(query, result) {
  console.assert(_.isEqual(answerQuery(facts, rules, query), result))
}

assertQuery(["ancestor", "carol", "Y"], [{"Y": "dennis"},
                                         {"Y": "david"}]);

assertQuery(["ancestor", "X", "carol"], [{"X": "bob"},
                                         {"X": "alice"}]);

console.log(answerQuery(facts, rules, ["ancestor", "X", "Y"]));
