// # Bottom Up Datalog

// ## Our example facts and rules

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

// ## The code
// To answer a query, we first need to build a database and then run
// our query against all the facts in the database.

function answerQuery(facts, rules, query) {
  return evalQuery(buildDatabase(facts, rules), query);
}

// buildDatabase takes rules and turns these rules into new facts
// based upon the facts so far. We then add these new facts and try to
// apply all the rules again until no new facts can be derived. (In
// fancy lingo: A fixpoint is reached)

function buildDatabase(facts, rules) {
  var newFacts = _.reduce(rules, addRule, facts);
  if (facts.length == newFacts.length) {
    return facts;
  } else {
    return buildDatabase(newFacts, rules);
  }
}

// Takes facts and a single rule and returns all the derived facts.

function addRule(facts, rule) {
  var newFacts = _.union(facts, ruleAsFacts(facts, rule));
  return _.uniq(newFacts, false, JSON.stringify);
}

// To turn a rule into a fact, we start by generating all the possible
// bindings of that rule. A binding for the rule

//       [["ancestor", "X", "Y"], ["parent", "X", "Y"]]

// could look like this:

//     {"X": "alice", "Y": "bob"}

// i.e. it contains all the possible variable bindings of a rule.
// 
// We now take all the possible bindings as an array and match them
// with the rule head, in our example case with

//     ["ancestor", "X", "Y"]

// leading to the result

//     ["ancestor", "alice", "bob"]
// FIXME: show that the result is actually an array of results

function ruleAsFacts(facts, rule) {
  var allPossibleBindings = generateBindings(facts, rule);
  return _.map(allPossibleBindings, _.partial(substitute, rule[0]))
}

//     [["ancestor", "X", "Y"], ["ancestor", "X", "Z"], ["ancestor", "Z", "Y"]]
//         ^                       ^                    ^
//      rule head                 goal 1              goal 2
// becomes

//     [{X: "alice", Y: "bob", Z:...}, {X: "alice", Y: "bill", Z:...}, ...]

function generateBindings(facts, rule) {
  // resolve all the variables in the goals of the rule
  // for one goal:
  // ["ancestor", "X", "Y"] ==> [{X: "alice", Y: "bob"}, {X: "alice", Y: "bill"}, ...]
  var goals = _.map(_.rest(rule), _.partial(evalQuery, facts));
  // several goals might have conflicting bindings, for example
  // [{X: "alice"}, {X: "bob"}] [{X: "alice", X: "bill"}]
  // unify all the resolved goals to compute the final binding

  // [{X: "alice"}, {X: "bob"}] [{X: "alice"}, {X: "bill"}] => [{X: "alice"}]
  //               ^                          ^                    ^
  //            goal 1                   goal 2                unified result

  // [{X: "alice", Y: "bob"}] [{X: "alice", Y: "bill"}] => []
  return _.reduce(_.rest(goals), unifyBindingArrays, _.first(goals));
}

// ## Evaluation

// Now that the database is complete, we can run evalQuery on the
// facts to get the result of the query.
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

function assertQuery(query, result) {
  console.assert(_.isEqual(answerQuery(facts, rules, query), result))
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


assertQuery(["ancestor", "carol", "Y"], [{"Y": "dennis"},
                                         {"Y": "david"}]);

assertQuery(["ancestor", "X", "carol"], [{"X": "bob"},
                                         {"X": "alice"}]);

console.log(answerQuery(facts, rules, ["ancestor", "X", "Y"]));
