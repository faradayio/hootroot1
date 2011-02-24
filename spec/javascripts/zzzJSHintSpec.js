describe('JSHint', function () {
  var options = { curly: true, white: true, indent: 2 },
      files = /\/javascripts\/app.*|\/javascripts\/lib.*|.*spec\.js/i,
      myself = /JSHintSpec\.js$/;

  function get(path) {
    path = path + "?" + new Date().getTime();

    var xhr;
    try {
      xhr = new jasmine.XmlHttpRequest();
      xhr.open("GET", path, false);
      xhr.send(null);
    } catch (e) {
      throw new Error("couldn't fetch " + path + ": " + e);
    }
    if (xhr.status < 200 || xhr.status > 299) {
      throw new Error("Could not load '" + path + "'.");
    }

    return xhr.responseText;
  }

  function it_statement() {
    var self = this;
    var source = get(script);
    var result = JSHINT(source, options);
    for (j = 0; j < JSHINT.errors.length; j++) {
      error = JSHINT.errors[j];
      self.addMatcherResult(new jasmine.ExpectationResult({
        passed: false,
        message: "line " + error.line + ' - ' + error.reason + ' - ' + error.evidence
      }));
    }
    expect(true).toBe(true); // force spec to show up if there are no errors
  }

  var scripts = document.getElementsByTagName('script');
  for (i = 0; i < scripts.length; i++) {
    var element = scripts[i];
    var script = element.getAttribute('src');
    if (files.test(script) && !myself.test(script)) {
      it(script, it_statement);
    }
  }
});
