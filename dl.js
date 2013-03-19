// # Bottom Up Datalog

// ## The database
//
// ---

// First of all, we need a few facts. Let's assume that Alice is the
// parent of both Bob and Bill; this can be expressed as the facts
// `["parent", "alice", "bob"]` and `["parent", "alice", "bill"]`.
// Let's also assume that Bob and Bill are parents themselves (and so
// forth).
//
// This part of the database is called the *Extensional Database*, or
// *EDB* for short, because we state the facts by simply enumerating
// them all.

var facts = [
  ["parent", "alice", "bob"],
  ["parent", "alice", "bill"],
  ["parent", "bob", "carol"],
  ["parent", "carol", "dennis"],
  ["parent", "carol", "david"]
]

// Let's now define a few rules, which allow us to derive new facts
// based on the existing database.
//
// We say that `"X"` is an ancestor of `"Y"` if `"X"` is either a
// direct parent (first case) or if we can trace a line of descendants
// between them using some intermediate ancestor `"Z"` (second case).
// As you might have guessed, every case starts with a head, which is
// a true fact whenever all the following goals are true.
//
// This part of the database is called the *Intensional Database*, or
// *IDB* for short, because we don't state facts directly but use
// rules to derive them. This part is what makes Datalog interesting.

var rules = [
  [["ancestor", "X", "Y"], ["parent", "X", "Y"]],
  [["ancestor", "X", "Y"], ["ancestor", "X", "Z"],
                           ["ancestor", "Z", "Y"]],
  [["family", "X", "Y"], ["ancestor", "X", "Y"]],
  [["family", "X", "Y"], ["family", "Y", "X"]]
]

// ## The code
// ---

// To answer a query, we first need to build a database and then run
// our query against all the facts in the database.

function answerQuery(facts, rules, query) {
  return evalQuery(buildDatabase(facts, rules), query);
}

// A database can be built by turning rules into new facts based upon
// the facts so far. We then add these new facts to the DB and try to
// apply all the rules again until no new facts can be derived. (In
// fancy lingo: Until a fixpoint is reached)

function buildDatabase(facts, rules) {
  var newFacts = _.reduce(rules, applyRule, facts);
  if (facts.length == newFacts.length) {
    return facts;
  } else {
    return buildDatabase(newFacts, rules);
  }
}

// To apply a rule to the existing database of facts, we turn a rule
// into a set of facts and take the union of these new facts and our
// existing facts, discarding all duplicate entries.

function applyRule(facts, rule) {
  var newFacts = _.union(facts, ruleAsFacts(facts, rule));
  return _.uniq(newFacts, false, JSON.stringify);
}

// To turn a rule into a fact, we start by generating all the possible
// bindings of that rule. A binding for the rule

//     [["ancestor", "X", "Y"], ["parent", "X", "Y"]]

// could look like

//     {"X": "alice", "Y": "bob"}

// i.e. it contains on set of possible variable bindings of that rule
// for which the rule becomes a true fact.
// 
// We now take all the possible bindings as an array and match them
// all with the rule head, in our example case with

//     ["ancestor", "X", "Y"]

// For our example binding above (which is just one possible binding),
// the result of matching it against the rule head would be

//     ["ancestor", "alice", "bob"]

// The result of turning a rule into a fact is now simply an array of
// all these matched bindings.

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
  //
  //       ["ancestor", "X", "Y"] ==> [{X: "alice", Y: "bob"}, {X: "alice", Y: "bill"}, ...]
  var goals = _.map(_.rest(rule), _.partial(evalQuery, facts));
  // several goals might have conflicting bindings, for example
  //
  //       [{X: "alice"}, {X: "bob"}] [{X: "alice", X: "bill"}]
  // unify all the resolved goals to compute the final binding
  //
  //       [{X: "alice"}, {X: "bob"}] [{X: "alice"}, {X: "bill"}] => [{X: "alice"}]
  //               ^                          ^                    ^
  //            goal 1                   goal 2                unified result
  //
  //       [{X: "alice", Y: "bob"}] [{X: "alice", Y: "bill"}] => []
  return _.reduce(_.rest(goals), unifyBindingArrays, _.first(goals));
}

// ## Evaluation
// ---

// Now that the database is complete, we can check which facts (if
// any) match against our query by comparing query and fact element
// for element, unifying variables if necessary.

function evalQuery(facts, query) {
  var matchingFacts = _.filter(facts, _.partial(unify, query));
  return _.map(matchingFacts, _.partial(asBinding, query));
}

// Takes a query, e.g.  `["parent","X","bob"]`
// and a fact, e.g.  `["parent","alice","bob"]`
// and returns true if all the atoms match (`"bob"` and `"bob"`),
// or if one of them is a variable (e.g. `"X"` and `"alice"`).
//
// Will return false if there is no match, e.g. `["parent", "alice", "bob"]`
// and `["parent", "alice", "carol"]`
// because the atoms `"bob"` and `"carol"` do not match.
function unify(query, fact) {
  return _.every(_.zip(query, fact), function(pair) {
    return pair[0] == pair[1] || isVariable(pair[0]) || isVariable(pair[1]);
  });
}


// Takes a query, e.g.  `["parent","X","bob"]`
// and a fact, e.g.  `["parent","alice","bob"]`
// and returns an object with the query variables as keys,
// and the matching atoms in the fact as values, e.g.
// `{"X": "alice"}`.
function asBinding(query, fact) {
  return _.pick(_.object(query, fact), _.filter(query, isVariable));
}

// An identifier is a variable if it starts with an uppercase symbol.
function isVariable(identifier) {
  return identifier[0].toUpperCase() == identifier[0]
}

// Takes a query (e.g. `["parent","X","bob"]`) and bindings (e.g. `{"X": "alice"}`)
// and substitutes each variable with the corresponding binding, e.g.
// `["parent","alice","bob"]`
function substitute(query, bindings) {
  return _.map(query, _.partial(unifyVar, bindings));
}

// Takes bindings (e.g. `{"X": "alice"}`) and looks up the value for
// the identifier if it's a variable. For example, `"X"` becomes `"alice"`, but 
// `"bob"` stays `"bob"`.
function unifyVar(bindings, identifier) {
  if (isVariable(identifier)) {
    return bindings[identifier] || identifier;
  } else {
    return identifier;
  }
}

// Takes two bindings, e.g. `{"X": "alice", "Y": "bob"}` and
// `{"X": "alice", "Z": "carol"}`, and returns the unification, e.g.
// `{"X": "alice", "Y": "bob", "Z": "carol"}`.
function unifyBindings(bindings1, bindings2) {
  var joined = _.defaults(_.clone(bindings1), bindings2);
  if (_.isEqual(joined, _.extend(_.clone(bindings1), bindings2))) {
    return joined;
  }
}

// Unifies all the bindings from one goal with all the bindings from
// another goal. Let's imagine for example the goals
// `["ancestor", "X", "Y"]` and `["ancestor", "Y", "Z"]`, for which
// the possible bindings might look like
//
//     [{"X": "alice", "Y": "bob"}, {"X": "teddy", "Y": "bob"}]
//
// and
//
//     [{"Y": "bob", "Z": "carol"}, {"Y": "joe", "Z": "jack"}]
//
// Now the result is
//
//     [{"X": "alice", "Y": "bob", "Z": "carol"},
//      {"X": "teddy", "Y": "bob", "Z": "carol"}]
//
// because both bindings in the first array can be unified with the
// first binding in the second array, but no unification is possible
// for the binding `{"Y": "joe", "Z": "jack"}`.


// Takes two arrays `arr1` and `arr2` of bindings. For each binding `b` in `arr1`,
// unifies it with each binding in `arr2` (and discards anything that cannot by unified).
function unifyBindingArrays(arr1, arr2) {
  return _.flatten(_.map(arr1, function(bindings) {
    return _.compact(_.map(arr2, _.partial(unifyBindings, bindings)))
  }))
}

// ## Examples
// ---

// Let's do some poor man's unit tests!
function assertQuery(query, result) {
  console.assert(_.isEqual(answerQuery(facts, rules, query), result))
}

// Carol should be the ancestor of both Dennis and David.
assertQuery(["ancestor", "carol", "Y"], [{"Y": "dennis"},
                                         {"Y": "david"}]);

// Bob and Alice should be the ancestors of Carol.
assertQuery(["ancestor", "X", "carol"], [{"X": "bob"},
                                         {"X": "alice"}]);

console.log(answerQuery(facts, rules, ["family", "X", "Y"]));

// And that's it for now! Of course this code is extremely naive (we
// build the whole database for every query, even if huge parts of it
// might never be used), but hopefully it demonstrates what Datalog is
// and how it works in principle.
