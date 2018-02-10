window.onload = function() {

	// Provide focus on input when #search container receives focus
	var s=document.querySelector("#search"),
	    f=s.querySelector("form"),
	    i=f.querySelector("input[type=search]");
	// Make focusable
	s.setAttribute('tabindex',0);
	// Focus input
	s.addEventListener("focus",function(e) {
		i.focus();
	});
	// Help iOS Safari and Chrome (enter key doesn't submit form when target="_blank"?)
	f.addEventListener("keypress",function(e) {
		if (e.keyCode == 13) {
			this.submit();
		}
	});

};
