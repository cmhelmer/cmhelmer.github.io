// TODO: 
// - Cut the mustard somewhere (is using DOMContentLoaded good for IE 9+?...
// - Extend for other modals (This is all a bit hacky...)
// - Fix search results to use custom query (current Safari bug on some wildcard searches: https://github.com/olivernn/lunr.js/issues/279)

(function() {
	"use strict";

	// Search ready flag
	window.searchReady = false;

	// Get site footer elements for modals (including search)
	var infoAside     = document.querySelector("#info"),
	    browseAside   = document.querySelector("#browse"),
	    searchAside   = document.querySelector("#search");

	// Get search elements
	var searchForm    = searchAside.querySelector("form"),
	    searchInput   = searchForm.querySelector("input[type=search]");

	// Set up display elements (mimic list-docs.html include)
	var searchContent = searchAside.querySelector(".aside-content"), // to place results
   	    searchTitle   = searchAside.querySelector(".aside-title"),   // to place results count and tooltip
	    resultsList   = document.createElement("ol"),
	    resultsCount  = document.createElement("span"),
	    searchTooltip = document.createElement("span");

	// Set up results count display
	resultsCount.classList.add("results-count");
	searchTitle.appendChild(resultsCount);

	// Set up results display
	resultsList.classList.add("doc-list");
	resultsList.classList.add("results-list");
	
	// Set up search tooltip
// 	searchTooltip.innerHTML = '<a href="#search-tooltip"><svg class="icon icon-info" width="16" height="16" role="img" title="Info"><use xlink:href="/assets/img/icons.svg#info"></use></svg></a><aside id="#search-tooltip" class="tooltip">Searching</aside>';

	// Get Lunr data
	// Try to initialize Lunr with session cache first
	// Or request data asynchronously
	var lunrData = JSON.parse(sessionStorage.getItem("lunrData")),
	    lunrIndex;

	try {
		lunrIndex = lunr.Index.load(JSON.parse(sessionStorage.getItem("lunrIndex")));
	}
	catch(error) {
		window.console.log("Couldn't load search with serialized index");
	}

	if (lunrData !== undefined && lunrIndex !== undefined) {
		window.console.log("Loaded search data from storage");
		captureSearch();
	}
	else {
		var request = new XMLHttpRequest();
		request.open("GET", "/data/corpus.json");
		request.onreadystatechange = loadData;
		request.send();
	}

	// Load Lunr data
	function loadData() {
		if (this.readyState === this.DONE && this.status === 200) {
			// Success
			window.console.log("Loaded search data asynchronously");

			// Set search data store
			lunrData = JSON.parse(this.response);

			// Cache data store for this session
			sessionStorage.setItem("lunrData", this.response);

			initLunr();

			return;
		}
		// Error
		window.console.log("Loading search data...");
	}

	// Initialize Lunr
	function initLunr() {

		// Add fields, match what's available in data
		lunrIndex = lunr(function () {
			this.field("uid");
			this.field("title");
			this.field("content");
			this.field("collection");
			this.field("tag");
			this.field("date");
			this.field("url");
			// this.field("author");
			// this.field("excerpt");
			// this.field("category");
			this.ref("id");

			// Use array index as unique reference 'id'
			lunrData.forEach(function(item, i) {
				item.id = i;
				this.add(item);
			}, this);
		});

		// Cache serialized index for this session
		sessionStorage.setItem("lunrIndex", JSON.stringify(lunrIndex));

		captureSearch();
	}

	// Hijack search now that we're loaded
	function captureSearch() {

		// Disable default action
		searchForm.addEventListener("submit", function(e) {
			e.preventDefault();
			searchIndex();
			return false;
		});

		// Hide submit button for that matter
		var submit = searchAside.querySelector('[type="submit"]');
		submit.parentNode.removeChild(submit);
		
		// ...and any content (like notice about Google Search)
		searchContent.innerHTML = "";
		
		// Add a tooltip
// 		searchTitle.appendChild(searchTooltip);

		// Listen for typing in search input and send to Lunr
		searchInput.addEventListener("keyup", searchIndex);
		
		// Set ready flag for other scripts using search
		window.searchReady = true;
	}

	// Search Lunr index
	function searchIndex() {
		// Go Lunr!
		// Silently add wildcard for typeahead results?
		var results = lunrIndex.search(searchInput.value);

		// Run custom query to include typeahead results in an efficient and sensible way
		// https://github.com/olivernn/lunr.js/issues/276
		/*
		var results = lunrIndex.query(function(q) {
			q.term(searchInput.value, { usePipeline: true, boost: 10 });
			q.term(searchInput.value, { usePipeline: false, boost: 1, wildcard: lunr.Query.wildcard.LEADING, wildcard: lunr.Query.wildcard.TRAILING });
			// q.term(searchInput.value, { usePipeline: false, boost: 1, editDistance: 1 }); // affects performance
		});
		*/

		displayResults(results);
	}

	// Display Lunr search results
	function displayResults(results) {

		// Clear old results
		searchContent.innerHTML = "";
		resultsList.innerHTML = "";

		// Display results count if there is a real search
		resultsCount.innerHTML = "";
		if (searchInput.value.length) {
			resultsCount.innerHTML = "Results: " + results.length;
		}

		// Set content
		if (results.length) {

			// Build results list
			results.forEach( function(item) {
			
				// Get full result from data store
				var result = lunrData[item.ref];
			
				var resultsItem      = document.createElement("li"),
				    resultsLink      = document.createElement("a"),
				    resultsPreview   = document.createElement("span"),
				    resultsReference = document.createElement("span");

				resultsItem.classList.add("doc-item");
				if (result.collection) {
					resultsItem.classList.add(result.collection + "-collection");
				}

				resultsLink.href = result.url;
				resultsLink.rel  = "bookmark";
			
				resultsPreview.classList.add("doc-preview");
				resultsPreview.innerHTML = result.title;

				resultsReference.classList.add("doc-reference");
				if (result.collection === "posts") {
					resultsReference.classList.add("doc-date");
					resultsReference.innerHTML = result.date;
				}
				else {
					resultsReference.classList.add("doc-id");
					resultsReference.innerHTML = result.uid;
				}
			
				resultsLink.appendChild(resultsPreview);
				resultsLink.appendChild(resultsReference);
				resultsItem.appendChild(resultsLink);
				resultsList.appendChild(resultsItem);
			});
			
			searchContent.appendChild(resultsList);
		}
	}

	// Create semantic modals
	// This could be automated, but as proof of concept this works
	var infoModal   = document.createElement("dialog"),
	    browseModal = document.createElement("dialog"),
	    searchModal = document.createElement("dialog");
	    
	// Identify modals (no support for multiple class names in classList.add in IE)
	infoModal.classList.add("info-modal");
	infoModal.classList.add("site-modal");
	browseModal.classList.add("browse-modal");
	browseModal.classList.add("site-modal");
	searchModal.classList.add("search-modal");
	searchModal.classList.add("site-modal");

	// Register modals with polyfill (extend support to IE9, Safari, Firefox...)
	dialogPolyfill.registerDialog(infoModal);
	dialogPolyfill.registerDialog(browseModal);
	dialogPolyfill.registerDialog(searchModal);

	// Remove site asides
	infoAside.parentNode.removeChild(infoAside);
	browseAside.parentNode.removeChild(browseAside);
	searchAside.parentNode.removeChild(searchAside);

	// Contain site asides in modals
	infoModal.appendChild(infoAside);
	browseModal.appendChild(browseAside);
	searchModal.appendChild(searchAside);

	// Add modals to body
	document.body.appendChild(infoModal);
	document.body.appendChild(browseModal);
	document.body.appendChild(searchModal);

	// Connect all nav links with modals
	var infoLinks   = document.querySelectorAll("a[href='#info']"),
	    browseLinks = document.querySelectorAll("a[href='#browse']"),
	    searchLinks = document.querySelectorAll("a[href='#search']");

	// Open modals on click of nav links
	infoLinks.forEach(function(item) {
		item.addEventListener("click", function(e) {
			e.preventDefault();
			openModal(infoModal);
			return false;
		});
	});
	browseLinks.forEach(function(item) {
		item.addEventListener("click", function(e) {
			e.preventDefault();
			openModal(browseModal);
			return false;
		});
	});
	searchLinks.forEach(function(item) {
		item.addEventListener("click", function(e) {
			e.preventDefault();
			openModal(searchModal);
			return false;
		});
	});

	// Open modal in style
	function openModal(modal) {

		// Dialog API (or polyfill)
		modal.showModal();

		// Add close listener (`esc` also works by default)
		modal.addEventListener("click", function(e) {
			if (e.target === this || e.target === this.querySelector("aside")) {
				closeModal(modal);
			}
		});
	}
	
	// Close modal in style
	function closeModal(modal) {
		// Dialog API (or polyfill)
		modal.close();
	}
	
	
	// Footnote manipulation
	// Work with kramdown output
	// Grab footnote and add alongside footnote reference
	// Then leave it to styles away
	
	// Get footnotes div
	var footnotes_container = document.querySelector(".footnotes");
	
	if (footnotes_container) {
		var footnotes = footnotes_container.querySelectorAll("[id^='fn:']");

		footnotes.forEach(function(footnote) {
			// Can be multiple backlinks in a footnote if referenced in content multiple times
			var backlinks = footnote.querySelectorAll("[href^='#fnref:']"),
			    backlinks_parent = backlinks[0].parentNode,
			    backlinks_refs = [];

			backlinks.forEach(function(backlink) {
				// Get reference(s) to footnote
				backlinks_refs.push(backlink.getAttribute("href").slice(1));

				// Remove backlink from footnote
				backlink.parentNode.removeChild(backlink);

				// Clean up trailing &nbsp; for inline backlinks
				if (backlinks_parent.innerHTML.slice(-"&nbsp;".length) === "&nbsp;") {
					backlinks_parent.innerHTML = backlinks_parent.innerHTML.slice(0, -"&nbsp;".length);
				}
			});
			
			// Clean up empty paragraphs for standalone backlinks
			if (!backlinks_parent.innerHTML) {
				backlinks_parent.parentNode.removeChild(backlinks_parent);
			}
			
			// Create footnote aside
			var footnote_aside = document.createElement("aside");
			footnote_aside.classList.add("aside-footnote");
			footnote_aside.innerHTML = footnote.innerHTML;
			
			// Add footnote aside to content
			// Fix possible conflict of ids with cloned elements
			// TODO: Instead, add as data attribute to <a> in hexadecimal Unicode for CSS content?
			backlinks_refs.forEach(function(backlink_ref) {
				var footnote_ref = document.getElementById(backlink_ref),
				    footnote_aside_clone = footnote_aside.cloneNode(true),
				    new_ref = backlink_ref.replace("ref", ""),
				    footnote_ref_a = footnote_ref.querySelector("a");
				footnote_aside_clone.id = new_ref;
				footnote_ref_a.setAttribute("href", "#" + new_ref);
				footnote_ref.appendChild(footnote_aside_clone);
				footnote_ref.classList.add("sup-footnote");

				// Adjust position of overlays to keep within viewport
				// Use CSS visibility: hidden not display: none to hide element
				// Include body margin for looks
				var aside_rect   = footnote_aside_clone.getBoundingClientRect(),
				    client_width = document.documentElement.clientWidth,
				    left         = 0,
				    body_margin  = 12; // px (could be gotten by accessing styles...)
				    
				if (aside_rect.right > (client_width - body_margin)) {
					left = (aside_rect.right - client_width + body_margin) * -1;
				}
				else if (aside_rect.left < body_margin) {
					left = (aside_rect.left * -1) + body_margin;
				}
				left += "px";
				footnote_aside_clone.style.left = left;
				footnote_aside_clone.style.setProperty("--left", left);
			});
		});
		
		// Remove original footnotes
		footnotes_container.parentNode.removeChild(footnotes_container);
	}
})();
