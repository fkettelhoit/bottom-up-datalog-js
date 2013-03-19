function getFunctionNames() {
  return _.map($(".highlight pre .function .title"), $.text);
}

function setIds() {
  $(".highlight pre .function").attr("id", function(_, _) {
    return $(this).children(".title").text();
  });
}

function getCode() {
  return $(".highlight pre");
}

function splitCode(snippet) {
  return snippet.split(/[(), ]/);
}

function linkUsagePoints(functionNames) {
  var names = _.sortBy(functionNames, length).reverse();
  _.each(getCode(), function(snippet) {
//    var tokens = splitCode(snippet);
    _.each(names, function(name){
      //console.log(name);
//      $(snippet).children(":contains("+name+")").wrap("<a href=\"http://www.google.com\" />");
      $(snippet).html(function(index, origText) {
        return origText.replace(new RegExp(name+"(?=[(),; ])", "g"), "<a href=\"#"+name+"\">"+name+"</a>");
      });
    });
  });
}

function replaceName(snippet, name) {
  $(snippet).html(function(index, origText) {
    return origText.replace(new RegExp(name), "<a href=\"#"+name+"\">"+name+"</a>");
  });
}

function foobar(snippet) {
  replaceName(snippet, "buildDatabase");
}

function addLinks() {
  setIds();
  linkUsagePoints(getFunctionNames());
}

