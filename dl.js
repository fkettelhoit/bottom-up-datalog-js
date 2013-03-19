// # Bottom Up Datalog

// ## Initial Facts & Rules
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

// ---

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

// ## Building the database
// ---

// To answer a query, we first need to build a database and then run
// our query against all the facts in the database.

function answerQuery(facts, rules, query) {
  return evalQuery(buildDatabase(facts, rules), query);
}

// ---

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

// ---

// To apply a rule to the existing database of facts, we turn a rule
// into a set of facts and take the union of these new facts and our
// existing facts, discarding all duplicate entries.

function applyRule(facts, rule) {
  var newFacts = _.union(facts, ruleAsFacts(facts, rule));
  return _.uniq(newFacts, false, JSON.stringify);
}

// ---

// To turn a rule into a fact, we start by generating all the possible
// bindings of that rule. A binding for the rule

//     [["ancestor", "X", "Y"], ["parent", "X", "Y"]]

// could look like

//     {"X": "alice", "Y": "bob"}

// i.e. it contains one set of possible variable bindings of that rule
// for which the rule becomes a true fact.

function ruleAsFacts(facts, rule) {
  var allPossibleBindings = generateBindings(facts, rule);
  return _.map(allPossibleBindings, _.partial(substitute, rule[0]))
}

// We now take all the possible bindings as an array and substitute
// the variables in the rule head with the corresponding values in the
// binding (where a variable is simply every capitalized string).
//
// For our example binding above (which is just one possible binding),
// the result of matching it against the rule head would be

//     ["ancestor", "alice", "bob"]

// The result of turning a rule into a fact is now simply an array of
// all these matched bindings.

function substitute(query, bindings) {
  return _.map(query, _.partial(unifyVar, bindings));
}

function unifyVar(bindings, identifier) {
  if (isVariable(identifier)) {
    return bindings[identifier] || identifier;
  } else {
    return identifier;
  }
}

function isVariable(identifier) {
  return identifier[0].toUpperCase() == identifier[0]
}

// ---

// Now let's see how bindings are generated. For the input

//     [["ancestor", "X", "Y"], ["ancestor", "X", "Z"],
//                                     ["ancestor", "Z", "Y"]]
//          ^                       ^         ^
//      rule head                 goal 1    goal 2

// we would like the output to be something along the lines of

//     [{X: "alice", Y: "bob", Z:...},
//      {X: "alice", Y: "bill", Z:...}, ...]

// To get there, we first of all need to resolve the variables of each
// goal, so that we get back several sets of possible bindings for
// each goal. An example of a result for 2 goals could be

//       [{X: "alice"}, {X: "bob"}] [{X: "alice", X: "bill"}]

// To be a valid binding for the whole rule, a variable binding must
// be valid for each goal. In the above example `"alice"` is a valid
// binding for `X`, but both `"bob"` and `"bill"` are only valid for
// one goal and thus not for the whole rule. This is why we need to
// unify all the bindings for each goal with all the bindings for all
// the other goals.

function generateBindings(facts, rule) {
  var goals = _.map(_.rest(rule), _.partial(evalQuery, facts));
  return _.reduce(_.rest(goals), unifyBindingArrays, _.first(goals));
}


// ---

// To see the unification of binding arrays in action, let's consider
// the goals `["ancestor", "X", "Y"]` and `["ancestor", "Y", "Z"]`,
// for which the possible bindings might look like
//
//     [{"X": "alice", "Y": "bob"}, {"X": "teddy", "Y": "bob"}]
//
// and
//
//     [{"Y": "bob", "Z": "carol"}, {"Y": "joe", "Z": "jack"}]
//
// respectively. Now the result is
//
//     [{"X": "alice", "Y": "bob", "Z": "carol"},
//      {"X": "teddy", "Y": "bob", "Z": "carol"}]
//
// because both bindings in the first array can be unified with the
// first binding in the second array, but no unification is possible
// for the binding `{"Y": "joe", "Z": "jack"}`.

// We get this result by unifying each binding of each goal with each
// binding of each other goal, while discarding all the falsy values
// (the bindings which cannot be unified) and then flattening the
// resulting collection in the end.

function unifyBindingArrays(arr1, arr2) {
  return _.flatten(_.map(arr1, function(bindings) {
    return _.compact(_.map(arr2, _.partial(unifyBindings, bindings)))
  }))
}

// The unification of 2 bindings is a simple merge of the 2 objects,
// where we make sure that whenever a variable is contained in both
// objects, the value is the same (or the unification of these 2
// bindings fails).

function unifyBindings(bindings1, bindings2) {
  var joined = _.defaults(_.clone(bindings1), bindings2);
  if (_.isEqual(joined, _.extend(_.clone(bindings1), bindings2))) {
    return joined;
  }
}

// ## Evaluation
// ---

// Now that the database is complete, we can check which facts (if
// any) match against our query by comparing query and fact element
// for element, unifying variables if necessary, and returning the
// results as bindings.

function evalQuery(facts, query) {
  var matchingFacts = _.filter(facts, _.partial(unify, query));
  return _.map(matchingFacts, _.partial(asBinding, query));
}

// ---

// The unification expects a query, e.g. `["parent","X","bob"]` and a
// fact, e.g. `["parent","alice","bob"]` and returns true if for all
// the atoms they either match (`"bob"` and `"bob"`), or if one of
// them is a variable (e.g. `"X"` and `"alice"`).
//
// It will return false if there is no match, e.g. for the query
// `["parent", "alice", "bob"]` and `["parent", "alice", "carol"]`
// because the atoms `"bob"` and `"carol"` do not match.

function unify(query, fact) {
  return _.every(_.zip(query, fact), function(pair) {
    return pair[0] == pair[1] || isVariable(pair[0]) || isVariable(pair[1]);
  });
}

// ---

// To turn a fact into a binding for a query, we take a query, e.g.
// `["parent","X","bob"]` and a fact, e.g.  `["parent","alice","bob"]`
// and return an object with the query variables as keys, and the
// matching atoms in the fact as values, e.g. `{"X": "alice"}`.

function asBinding(query, fact) {
  return _.pick(_.object(query, fact), _.filter(query, isVariable));
}

// ## Examples
// ---

// Let's make sure we understand how Datalog works. The following
// should be true:
//
// +  Carol should be the ancestor of both Dennis and David.
// +  Bob and Alice should be the ancestors of Carol.

function assertQuery(query, result) {
  console.assert(_.isEqual(answerQuery(facts, rules, query), result))
}

assertQuery(["ancestor", "carol", "Y"], [{"Y": "dennis"},
                                         {"Y": "david"}]);

assertQuery(["ancestor", "X", "carol"], [{"X": "bob"},
                                         {"X": "alice"}]);

console.log(answerQuery(facts, rules, ["family", "X", "Y"]));

// And that's it for now! Of course this way of evaluating Datalog
// queries is extremely naive (we build the whole database for every
// query, even if huge parts of the DB might never be used), but
// hopefully it demonstrates what Datalog is and how it works in
// principle.
