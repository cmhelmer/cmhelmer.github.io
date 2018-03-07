// TODO: 
// - Cut the mustard somewhere (is using DOMContentLoaded good for IE 9+?...
// - Extend for other modals (This is all a hack job...)
// - Fix search results to use custom query (current Safari bug on some wildcard searches: https://github.com/olivernn/lunr.js/issues/279)

(function() {
	"use strict";

	
	function siteSearch() {
		
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
				var resultsCountText = results.length + " result";
				if (results.length !== 1 ) {
					resultsCountText = resultsCountText + "s";
				}
				resultsCount.innerHTML = resultsCountText;
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
		    searchModal = document.createElement("dialog"),
		    openedModal;
			
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
		
		// Upgrade dialog to retain focus and restore it when closed
		registerFocusRestoreDialog(infoModal);
		registerFocusRestoreDialog(browseModal);
		registerFocusRestoreDialog(searchModal);
	
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

		// Add close listeners (`esc` also works by default)
		infoModal.addEventListener("click", function(e) {
			if (e.target === this || e.target === this.querySelector("aside")) {
				closeModal(infoModal);
			}
		});
		browseModal.addEventListener("click", function(e) {
			if (e.target === this || e.target === this.querySelector("aside")) {
				closeModal(browseModal);
			}
		});
		searchModal.addEventListener("click", function(e) {
			if (e.target === this || e.target === this.querySelector("aside")) {
				closeModal(searchModal);
			}
		});
	
		// Connect all nav links with modals
		var infoLinks   = document.querySelectorAll("a[href='#info']"),
		    browseLinks = document.querySelectorAll("a[href='#browse']"),
		    searchLinks = document.querySelectorAll("a[href='#search']");
	
		// Open modals on click of nav links
		// TODO: Add just one listener to parent
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
			
			// Close open modal first
// 			closeModal(openedModal); // Bug?

			// Set open modal
			openedModal = modal;
	
			// Dialog API (or polyfill)
			modal.showModal();
		}
		
		// Close modal in style
		function closeModal(modal) {
			// Dialog API (or polyfill)
			modal.close();
		}

		// Add top-secret keyboard shortcuts (
		window.addEventListener("keydown", function(e) {
			if ( e.ctrlKey ) {
				switch ( e.key ) {
					case 'o':
						openModal(searchModal);
						break;
					case 'b':
						openModal(browseModal);
						break;
					case 'i':
						openModal(infoModal);
						break;
				}
			}
		});
	}
	
	siteSearch();	
	
	// Footnote manipulation
	// Work with kramdown output
	// Grab footnote and add alongside footnote reference
	// Then leave it to CSS
	function inlineFootnotes() {

		// Get footnotes div
		var footnotesContainer = document.querySelector(".footnotes");
		
		if (footnotesContainer) {
			var footnotes     = footnotesContainer.querySelectorAll("[id^='fn:']"),
				footnoteAside = document.createElement("aside");

			footnoteAside.classList.add("aside-footnote");
	
			footnotes.forEach(function(footnote) {
				// Can be multiple backlinks in a footnote if referenced in content multiple times
				var backlinks = footnote.querySelectorAll("[href^='#fnref:']"),
				    backlinksParent = backlinks[0].parentNode,
				    backlinksRefs = [];
	
				backlinks.forEach(function(backlink) {
					// Get reference(s) to footnote
					backlinksRefs.push(backlink.getAttribute("href").slice(1));
	
					// Remove backlink from footnote
					backlink.parentNode.removeChild(backlink);
	
					// Clean up trailing &nbsp; for inline backlinks
					if (backlinksParent.innerHTML.slice(-"&nbsp;".length) === "&nbsp;") {
						backlinksParent.innerHTML = backlinksParent.innerHTML.slice(0, -"&nbsp;".length);
					}
				});
				
				// Clean up empty paragraphs for standalone backlinks
				if (!backlinksParent.innerHTML) {
					backlinksParent.parentNode.removeChild(backlinksParent);
				}
				
				// Add footnote aside to content
				// Fix possible conflict of ids with cloned elements
				// TODO: Instead, add as data attribute to <a> in hexadecimal Unicode for CSS content?
				backlinksRefs.forEach(function(backlinkRef) {
					var footnoteRef        = document.getElementById(backlinkRef),
					    footnoteAsideClone = footnoteAside.cloneNode(true),
					    newBacklinkRef     = backlinkRef.replace("ref", ""),
					    footnoteRefLink    = footnoteRef.querySelector("a");

					footnoteAsideClone.id = newBacklinkRef;
					footnoteAsideClone.innerHTML = footnote.innerHTML;
					footnoteRefLink.setAttribute("href", "#" + newBacklinkRef);
					footnoteRef.appendChild(footnoteAsideClone);
					footnoteRef.classList.add("sup-footnote");
	
					// Adjust position of overlays to keep within viewport
					// Use CSS visibility: hidden not display: none to hide element
					// Include body margin for looks
					adjustFootnote(footnoteAsideClone);
				});
			});
			
			// Remove original footnotes
			footnotesContainer.parentNode.removeChild(footnotesContainer);

			function adjustFootnote(footnoteAside) {
				var asideRect   = footnoteAside.getBoundingClientRect(),
				    clientWidth = document.documentElement.clientWidth,
				    left        = 0,
				    bodyMargin  = 12, // px (could be gotten by accessing styles...)
				    asideStyle  = window.getComputedStyle(footnoteAside),
				    asideAdjust = asideStyle.getPropertyValue("left");
					
				if (asideRect.right > (clientWidth - bodyMargin)) {
					left = (asideRect.right - clientWidth + bodyMargin) * -1;
				}
				else if (asideRect.left < bodyMargin) {
					left = (asideRect.left * -1) + bodyMargin;
				}
				
				left += "px";

				if ( left !== asideAdjust ) {
					footnoteAside.style.left = left;
					footnoteAside.style.setProperty("--left", left); // see CSS
				}

			}
			
			var footnoteAsides = document.querySelectorAll(".aside-footnote");
			window.addEventListener('resize', function(){
				footnoteAsides.forEach(function(el){
					adjustFootnote(el);
				});
			});
		}
	}

	inlineFootnotes();

})();
