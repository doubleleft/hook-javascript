(function(window) {
	//
	// compatibility with amd
  // WARNING: i'm fucking weird, please fix me
	//
	window.define = function(factory, func) {
		try{ delete window.define; } catch(e){ window.define = void 0; } // IE

    if (typeof(factory)==="function") {
      // whenjs
      window.when = factory();
    } else {
      window[factory] = func();
    }
	};
	window.define.amd = {};
