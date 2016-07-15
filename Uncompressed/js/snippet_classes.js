// functions common to Snip and Folder
window.Generic = function(){
	this.matchesUnique = function(name){
		return this.name.toLowerCase() === name.toLowerCase();
	};
	
	this.matchesLazy = function(text){		
		// searching is case-insensitive
		return new RegExp(text, "i").test(this.name + this.body);
	};
	
	this.matchesWord = function(text){
		return new RegExp("\\b" + text + "\\b", "i").test(this.name + this.body);
	};
	
	// deletes `this` from parent folder
	this.remove = function(){
		var index = Data.snippets.getUniqueObjectIndex(this.name, this.type),
			thisIndex = index.pop();
		
		var folder = Data.snippets;
		while(index.length > 0)
			folder = folder.list[index.shift()];
		console.log(folder.name, thisIndex);
		folder.list.splice(thisIndex, 1);		
	};

	this.getParentFolder = function(){			
		var index = Data.snippets.getUniqueObjectIndex(this.name, this.type),
			parent = Data.snippets;
		
		// last element is `this` index, we want parent so -1
		for(var i = 0, lim = index.length - 1; i < lim; i++)
			parent = parent.list[index[i]];
		
		return parent;
	};		

	this.moveTo = function(newFolder){
		var x = this.clone();
		this.remove();
		Folder.insertObject(x, newFolder);			
	};
	
	// a folder cannot be nested under its subfolders, hence a check
	this.canNestUnder = function(newFolder){
		if(Folder.isFolder(this)){
			while(newFolder.name !== Folder.MAIN_SNIPPETS_NAME){
				if(this.name === newFolder.name)
					return false;
				
				newFolder = newFolder.getParentFolder();
			}
		}				
		
		// no need to check for snippets		
		return true;
	};
};
// class added to newly created snip/folder
// to highlight it
Generic.HIGHLIGHTING_CLASS = "highlighting";
// returns the DOM element for edit and delete button
Generic.getButtonsDOMElm = function(){
	var divButtons = document.createElement("div").addClass("buttons");	
	divButtons.appendChild(document.createElement("div").addClass("edit_btn"))
		.setAttribute("title", "Edit");
	divButtons.appendChild(document.createElement("div").addClass("delete_btn"))
		.setAttribute("title", "Delete");
	return divButtons;
};	

Generic.getDOMElement = function(objectNamesToHighlight){
	var divMain, divName, img;
	
	// security checks
	objectNamesToHighlight = objectNamesToHighlight === undefined ? [] :
							!Array.isArray(objectNamesToHighlight) ? [objectNamesToHighlight] :
							objectNamesToHighlight;

	divMain = document.createElement("div")
				.addClass([this.type, "generic", Snip.DOMContractedClass]);
	
	img = document.createElement("img");
	img.src = "../imgs/" + this.type + ".png";
	divMain.appendChild(img);
	
	// creating the short `div` element
	divName = document.createElement("div");
	// text with newlines does not fit in one line
	divName.text(this.name).addClass("name");
	divMain.appendChild(divName);
	
	divMain.appendChild(Generic.getButtonsDOMElm());
	
	if(objectNamesToHighlight.indexOf(this.name) > -1){
		divMain.removeClass(Snip.DOMContractedClass);
		// highlight so the user may notice it #ux
		// remove class after 3 seconds else it will
		// highlight repeatedly
		divMain.addClass(Generic.HIGHLIGHTING_CLASS);
		setTimeout(function(){
			divMain.removeClass(Generic.HIGHLIGHTING_CLASS);
		}, 3000); 
	}
	
	return divMain;
};

// when we attach click handler to div.snip/.folder
// .buttons div click handlers get overrided
Generic.preventButtonClickOverride = function(handler){
	return function(e){
		if(!e.target.matches(".buttons, .buttons div"))
			handler.call(this, e);
	};
};

Generic.getDuplicateObjectsText = function(text, type){
	return "A " + type + " with name '" + text + 
			"' already exists (possibly with the same letters in upper/lower case.)";
};

Generic.isValidName = function(name, type){
	return  name.length === 0   ? "Empty name field" :
			name.length > OBJECT_NAME_LIMIT ? "Name cannot be greater than " + OBJECT_NAME_LIMIT  + 
									" characters. Current name has " + (name.length - OBJECT_NAME_LIMIT) +
									" more characters." : 
			Data.snippets.getUniqueObject(name, type) ?
				Generic.getDuplicateObjectsText(name, type) : "true";
};

Generic.FOLDER_TYPE = "folder";
Generic.SNIP_TYPE = "snip";
Generic.CTX_START = {};
Generic.CTX_START[Generic.SNIP_TYPE] = Generic.SNIP_TYPE + "_";
Generic.CTX_START[Generic.FOLDER_TYPE] = Generic.FOLDER_TYPE + "_";
Generic.CTX_SNIP_REGEX = new RegExp(Generic.CTX_START[Generic.SNIP_TYPE]);
	
window.Snip = function(name, body, timestamp){
	this.name = name;
	this.body = body;
	this.timestamp = timestamp || Date.now();
	this.type = Generic.SNIP_TYPE;

	this.edit = function(newName, newBody){
		this.name = newName;
		this.body = newBody;
	};
			
	// "index" is index of this snip in Data.snippets
	this.getDOMElement = function(objectNamesToHighlight){
		function toggledivBodyText(snip){
			if(divMain.hasClass(Snip.DOMContractedClass)){
				divBody.html(snip.body.replace(/\n/g, " "));
							
				// during this call is going on, divName has't been shown on screen yet
				// so clientWidth returns zero, hence, wait for a short duration before
				// setting style.width
				setTimeout(function(){
					divBody.style.width = "calc(100% - 90px - " + divName.clientWidth + "px)";
				}, 1);
			}
			else{
				divBody.html(snip.body);				
				divBody.style.width = "";				
			}
		}
		
		var divMain = Generic.getDOMElement.call(this, objectNamesToHighlight),
			divName = divMain.querySelector(".name"), divBody;
		
		// our `div` body element; with Snip body
		divBody = document.createElement("div").addClass("body");
		toggledivBodyText(this);
		divMain.appendChild(divBody);		
		
		divMain.appendChild(Snip.getClickableDOMElm())
			.on("click", 
			Generic.preventButtonClickOverride(function(){
				divMain.toggleClass(Snip.DOMContractedClass);
				toggledivBodyText(this);
			}.bind(this)));
					
		var timestampElm = document.createElement("div")
							.addClass("timestamp")
							.html(Snip.getTimestampString(this));			
		divMain.appendChild(timestampElm);
		
		return divMain;
	};

	this.clone = function(){
		return new Snip(this.name, this.body, this.timestamp);
	};

	// returns object representation of this Snip object
	this.toArray = function(){
		return {
			name : this.name,
			body : this.body,
			timestamp : this.timestamp
		};
	};
};
Snip.prototype = new Generic();

Snip.fromObject = function(snip){
	var nSnip = new Snip(snip.name, snip.body);
	
	// remove "Created on " part from timestamp
	nSnip.timestamp = 
				!snip.timestamp ? Date.now() : // can be undefined
					typeof snip.timestamp === "number" ? 
						snip.timestamp :
						Date.parse(snip.timestamp.substring(11));
	
	return nSnip;
};
Snip.isValidName = function(name){
	var vld = Generic.isValidName(name, Generic.SNIP_TYPE),
		delimiterMatchExists  = name.match(window.snipNameDelimiterListRegex);
	
	return  delimiterMatchExists ? "Name contains delimiter - '" + delimiterMatchExists[0] + 
									"' Please change delimiters in Settings page or remove this character from snip name.":
			vld !== "true"       ? vld :
			/^%.+%$/.test(name)  ? "Name cannot be of the form '%abc%'" :
			"true";
};
Snip.isValidBody = function (body){
	return body.length ? "true" : "Empty body field";
};
Snip.getTimestampString = function(snip){
	return "Created on " + getFormattedDate(snip.timestamp);
};

Snip.removeSpamDivNodes = function(elm){	
	var container = document.createElement("div").html(getHTML(elm)),
		div = container.querySelector("div");
	
	while(div){
		// if div contains a break element, it implies that it's structure is:
		// <div><br><br><br><br>...n times</div>
		if(!div.querySelector("br"))
			container.insertBefore(document.createElement("br"), div);
		div.unwrap();
		
		div = container.querySelector("div");		
		console.log(container.innerHTML);
	}
	
	return container.innerHTML.replace(/<br>/g, "\n");
};

// if we set divMain.click, then .body gets clicked
// even when user is selecting text in it
// hence we should put a selectable but transparent
// element at the top
Snip.getClickableDOMElm = function(){
	return document.createElement("div").addClass("clickable");
};

// class added to .snip when it is contracted
// i.e., .body is shown with ellipsis
Snip.DOMContractedClass = "contracted";

window.Folder = function(name, list, timestamp, isSearchResultFolder){
	this.name = name;
	this.type = Generic.FOLDER_TYPE;
	this.timestamp = timestamp || Date.now();
	this.list = (list || []).slice(0);
	this.isSearchResultFolder = !!isSearchResultFolder;
	
	// only options page mutates list
	if(window.IN_OPTIONS_PAGE) observeList(this.list);
	
	function getObjectCount(type){
		return function(){
			return this.list.reduce(function(count, object){
				return object.type === type ? count + 1 : count;
			}, 0);
		};
	}
	
	this.getSnippetCount = getObjectCount(Generic.SNIP_TYPE);
	this.getFolderCount = getObjectCount(Generic.FOLDER_TYPE);
	
	this.getLastFolderIndex = function(){
		var i = 0, len = this.list.length;
		
		while(i < len && Folder.isFolder(this.list[i]))
			i++;
		
		return i - 1;
	};
	
	function adder(isSnippet){
		return function(name, body, timestamp){
			var folderName = this.name, newObj;
			
			newObj = isSnippet ?
						new Snip(name, body, timestamp) :
						new Folder(name);
			
			Folder.insertObject(newObj, this);
			
			latestRevisionLabel = "created " + newObj.type + " \"" + newObj.name + "\"";
			
			saveSnippetData(undefined, folderName, newObj.name);
		};
	}
	
	this.addSnip = adder(true);
	
	function editer(type){
		return function(oldName, newName, body){
			var object = Data.snippets.getUniqueObject(oldName, type),
				parent = object.getParentFolder();
			
			object.edit(newName, body);
			latestRevisionLabel = "edited " + type + " \"" + oldName + "\"";
			
			saveSnippetData(undefined, parent.name, newName);
		};
	}
	
	this.editSnip = editer(Generic.SNIP_TYPE);

	this.addFolder = adder(false);
	
	this.editFolder = editer(Generic.FOLDER_TYPE);

	this.edit = function(newName){
		this.name = newName;
	};

	this.getDOMElement = function(objectNamesToHighlight){
		// get prepared divMain from Generic class
		// and add click handler to the divMain and then return it
		return Generic.getDOMElement.call(this, objectNamesToHighlight)					
			.on("click", Generic.preventButtonClickOverride(this.listSnippets.bind(this)));
	};

	this.getDOMElementFull = function(objectNamesToHighlight) {
		var div = document.createElement("div"),
			listElm, htmlElm, emptyDiv;
		
		for(var i = 0, len = this.list.length; i < len; i++){
			listElm = this.list[i];
			htmlElm = listElm.getDOMElement(objectNamesToHighlight);
			div.appendChild(htmlElm);
		}
		
		if(len === 0){
			emptyDiv = document.createElement("div");
			emptyDiv.addClass("empty_folder")
					.html(this.isSearchResultFolder ?
								"No matches found" : "This folder is empty");
			div.appendChild(emptyDiv);
		}

		return div;
	};
		
	this.getUniqueObject = function(name, type){
		var index = this.getUniqueObjectIndex(name, type);
		
		if(!index) return null;
		
		var	folder = this;
		
		for(var i = 0, len = index.length; i < len; i++)		
			folder = folder.list[index[i]];
		
		return folder;
	};
	
	this.getUniqueObjectIndex = function(name, type){
		return Folder.indices[type][name.toLowerCase()];
	};
	
	function getUniqueObjectFn(type){
		return function(name){				
			return this.getUniqueObject(name, type);
		};
	}
	
	function getUniqueObjectIndexFn(type){
		return function(name){
			return this.getUniqueObjectIndex(name, type);
		};
	}
	
	this.getUniqueSnip = getUniqueObjectFn(Generic.SNIP_TYPE);
	
	// return value of index is a n-length array of indexes
	// where each int from 0 to n-2 index in array
	// is the index of folder (0=outermost; n-2=innermost)
	// and (n-1)th value is index of snippet in innnermost folder
	this.getUniqueSnipIndex = getUniqueObjectIndexFn(Generic.SNIP_TYPE);
	
	this.getUniqueFolder = getUniqueObjectFn(Generic.FOLDER_TYPE);
	
	this.getUniqueFolderIndex = getUniqueObjectIndexFn(Generic.FOLDER_TYPE);
	
	this.searchSnippets = function(text){
		text = escapeRegExp(text);

		return new Folder(Folder.SEARCH_RESULTS_NAME + this.name,
				this.list.reduce(function(result, listElm){
					if(Folder.isFolder(listElm))
						result = result.concat(listElm.searchSnippets(text).list);
					
					if(listElm.matchesLazy(text))
						result.push(listElm);
					
					return result;
				}, []).sort(function(a, b){
					return  b.matchesUnique(text) ? 1 :
							!a.matchesUnique(text) &&
								b.matchesWord(text) ? 1 :
							-1;
							
				}), undefined, true
			);
	};
	
	this.sort = function(filterType, descendingFlag){
		function sort(arr){
			arr.sort(function(a, b){
				return alphabeticSort ?
					a.name.localeCompare(b.name) :
					a.timestamp - b.timestamp;
			});
			
			return descendingFlag ? arr.reverse() : arr;
		}
		
		var alphabeticSort = filterType === "alphabetic",			
			lastSnippetIndex = this.getLastFolderIndex() + 1,
			folders = this.list.slice(0, lastSnippetIndex),
			snippets = this.list.slice(lastSnippetIndex);
		
		// sort folders&snippets separately so that
		// folders are always above snippets
		this.list = sort(folders).concat(sort(snippets));			
		
		saveSnippetData(undefined, this.name);
	};
	
	this.listSnippets = function(objectNamesToHighlight){
		// can also be a MouseEvent (generated on click)
		objectNamesToHighlight = isObject(objectNamesToHighlight) ? 
									undefined : objectNamesToHighlight;
		$containerSnippets.html("") // first remove previous content
			.appendChild(this.getDOMElementFull(objectNamesToHighlight));
		this.insertFolderPathDOM();
	};
	
	function insertPathPartDivs(name){
		var pathPart = document.createElement("div").addClass("path_part"),
			rightArrow = document.createElement("div").addClass("right_arrow");
			
		$containerFolderPath.appendChild(pathPart.html(name));
		$containerFolderPath.appendChild(rightArrow);
	}
	
	this.insertFolderPathDOM = function(){
		$containerFolderPath.html(""); // clear previous data			
		
		if(this.isSearchResultFolder){
			insertPathPartDivs(this.name); return;
		}
		
		insertPathPartDivs(Folder.MAIN_SNIPPETS_NAME);
		
		var index = Data.snippets.getUniqueFolderIndex(this.name),
			i = 0, len = index.length, folder = Data.snippets;
		
		for(; i < len; i++){
			folder = folder.list[index[i]];
			insertPathPartDivs(folder.name);
		}
		
		Folder.implementChevronInFolderPath();
	};

	// returns array representation of this Folder object
	this.toArray = function(){
		return [this.name, this.timestamp]
				.concat(this.list.map(function(listElm){				
					return listElm.toArray();
				}));
	};

	this.getFolderSelectList = function(nameToNotShow){
		var mainContainer = document.createElement("div"),
			$folderName = document.createElement("p").html(this.name),
			childContainer, hasChildFolder = false;
		
		mainContainer.appendChild($folderName);
		
		if(this.name !== Folder.MAIN_SNIPPETS_NAME)
			mainContainer.addClass("collapsed");
		
		this.list.forEach(function(e){
			if(Folder.isFolder(e) && e.name !== nameToNotShow){
				hasChildFolder = true;
				childContainer = e.getFolderSelectList(nameToNotShow);
				childContainer.style.marginLeft = "15px";
				mainContainer.appendChild(childContainer);
			}
		});
		
		if(!hasChildFolder)
			mainContainer.addClass("empty");
		
		return mainContainer;
	};

	this.clone = function(){
		return new Folder(this.name, this.list, this.timestamp);
	};
	
	this.getUniqueSnippetAtCaretPos = function (node, pos){
		var val = getText(node), snip, stringToCheck = "",
			foundSnip = null, delimiterChar = val[pos - 1],
			lim = pos < OBJECT_NAME_LIMIT ? pos : OBJECT_NAME_LIMIT;
		
		for(var i = 1; i <= lim; i++){
			// the previous delimiter char gets added to the
			// string to check as we move towards left			
			stringToCheck += delimiterChar;
			delimiterChar = val[pos - 1 - i];
			
			if((snip = this.getUniqueSnip(stringToCheck))){
				if(Data.matchWholeWord && window.snipNameDelimiterListRegex){
					// delimiter char may not exist if snip name
					// is at the beginning of the textbox
					if(!delimiterChar ||
						window.snipNameDelimiterListRegex.test(delimiterChar) ||
						delimiterChar === "\n") // a new line character is always a delimiter
						foundSnip = snip;
				}
				else foundSnip = snip;
			}
		}

		return foundSnip;
	};
	
	this.createCtxMenuEntry = function(parentId){
		console.dir(this);
		this.list.forEach(function(object){
			var id = Generic.CTX_START[object.type] + object.name;
			
			chrome.contextMenus.create({
				contexts: ["editable"],
				id: id, // unique id
				title: object.name,
				parentId: parentId
			}, function(){
				if(chrome.runtime.lastError);
				// do nothing
			});

			listOfSnippetCtxIDs.push(id);
			
			if(Folder.isFolder(object)) object.createCtxMenuEntry(id);
		});
		
		if(this.list.length === 0){
			var id = "Empty folder " + this.name;

			chrome.contextMenus.create({
				contexts: ["editable"],
				id: id, // unique id
				title: text,
				parentId: parentId
			}, function(){
				if(chrome.runtime.lastError);
				// do nothing
			});
			
			listOfSnippetCtxIDs.push(id);
		}
	};	
};
Folder.prototype = new Generic();

// returns a Folder object based on Array
Folder.fromArray = function(arr){
	// during 2.8.0 version, first element of arr
	// was not the name of folder
	if(typeof arr[0] !== "string")
		arr.unshift(Folder.MAIN_SNIPPETS_NAME);
	
	// 2nd elm is timestamp
	if(typeof arr[1] !== "number")
		arr.splice(1, 0, Date.now());
	
	// name of folder is arr's first element
	var folder = new Folder(arr.shift(), undefined, arr.shift());
	
	folder.list = arr.map(function(listElm){
		return Array.isArray(listElm) ? 
				Folder.fromArray(listElm) :
				Snip.fromObject(listElm);
	});
	
	// only options page mutates list
	if(window.IN_OPTIONS_PAGE)
		observeList(folder.list);
	
	return folder;
};
Folder.isValidName = function(name){
	return Generic.isValidName(name, Generic.FOLDER_TYPE);
};
Folder.isFolder = function(elm){
	return elm.type === Generic.FOLDER_TYPE;
};
Folder.MAIN_SNIPPETS_NAME = "Snippets";
Folder.SEARCH_RESULTS_NAME = "Search Results in ";
Folder.CHEVRON_TEXT = "<<";
Folder.setIndices = function(){
	function set(type, name, index){
		Folder.indices[type][name.toLowerCase()] = index;
	}
	
	function repeat(obj, index){
		var idx = 0, idx2;
		
		set(obj.type, obj.name, index);
	
		obj.list.forEach(function(elm){		
			idx2 = index.concat(idx);
			
			if(Folder.isFolder(elm)) repeat(elm, idx2);
			else set(elm.type, elm.name, idx2);
			
			idx++;
		});		
	}

	// reset
	Folder.indices = {};
	Folder.indices[Generic.FOLDER_TYPE] = {};
	Folder.indices[Generic.SNIP_TYPE] = {};
	
	repeat(Data.snippets, []);
};
Folder.copyContents = function(fromFolder, toFolder){
	fromFolder.list.forEach(function(e){
		Folder.insertObject(e.clone(), toFolder);
	});
};
Folder.insertObject = function(object, folder){
	if(Folder.isFolder(object)) folder.list.unshift(object);
	else folder.list.splice(folder.getLastFolderIndex() + 1, 0, object);
};
Folder.insertBulkActionDOM = function(listedFolder){
	var	container = document.createElement("div");
	
	listedFolder.list.forEach(function(listElm){
		var $generic = document.createElement("div").addClass("generic"),
			checkbox = document.createElement("input"),
			img = document.createElement("img"),
			div = document.createElement("div").addClass("name").html(listElm.name);
			
		checkbox.type = "checkbox";			
		img.src = "../imgs/" + listElm.type + ".png";
		div.on("click", function(){
			checkbox.checked = !checkbox.checked;
		});
		
		$generic.appendChild(checkbox);
		$generic.appendChild(img);			
		$generic.appendChild(div);
		container.appendChild($generic);
	});
	
	$containerSnippets.html("") // first remove previous content
		.appendChild(container);		
	
	return container;
};
Folder.getSelectedFolderInSelectList = function(selectList){
	var selectFolderName = selectList.querySelector(".selected").html();
	
	return Data.snippets.getUniqueFolder(selectFolderName);
};
Folder.refreshSelectList = function(selectList){
	selectList.html("")
		.appendChild(Data.snippets.getFolderSelectList());
	
	// select top-most "Snippets" folder; do not use fistChild as it may
	// count text nodes
	selectList.children[0].children[0].addClass("selected");
};
// do not remove newly inserted chevron as it will again exceed
// width causing recursion
Folder.implementChevronInFolderPath = function(notRemoveChevron){
	var ACTUAL_ARROW_WIDTH = 15;
	
	function computeTotalWidth(){			
		var arrowCount = 0,
			totalWidth =
				[].slice.call($containerFolderPath.children, 0).reduce(function(sum, elm){
					var isArrow = elm.hasClass("right_arrow");
					return isArrow ? (arrowCount++, sum) : sum + elm.offsetWidth;
				}, 0);
			
		// arrows, being titled, actually take up less space (falf their width)
		totalWidth += arrowCount * ACTUAL_ARROW_WIDTH;
		
		return totalWidth;
	}
	
	var width = $containerFolderPath.offsetWidth,
		totalWidth = computeTotalWidth(),
		lastPathPart = $containerFolderPath.lastChild.previousElementSibling,
		pathPart, doesChevronExist,
		folderObj = Folder.getListedFolder();
	
	if(totalWidth > width){
		pathPart = $containerFolderPath.querySelector(".path_part:not(.chevron)");
		
		if(pathPart === lastPathPart){
			pathPart.style.width = $containerFolderPath.offsetWidth
									- ACTUAL_ARROW_WIDTH - 50 // for the chevron
									+ "px";
			pathPart.addClass("ellipsized");
		}
		else{
			doesChevronExist = !!$containerFolderPath.querySelector(".chevron");
			
			// remove the right arrow
			$containerFolderPath.removeChild(pathPart.nextElementSibling);
			
			// only one chevron allowed
			if(doesChevronExist) $containerFolderPath.removeChild(pathPart);
			else pathPart.addClass("chevron").html(Folder.CHEVRON_TEXT);
			
			// recheck if width fits correctly now
			Folder.implementChevronInFolderPath(true);
		}
	}
	// clear previous chevrons
	else if(!notRemoveChevron && $containerFolderPath.querySelector(".chevron"))
		folderObj.insertFolderPathDOM();
};
Folder.getListedFolderName = function(){
	return $containerFolderPath.querySelector(":nth-last-child(2)").html();
};
Folder.getListedFolder = function(){
	var name = Folder.getListedFolderName(),
		idx = name.indexOf(Folder.SEARCH_RESULTS_NAME);
	
	if(idx != -1) name = name.substring(Folder.SEARCH_RESULTS_NAME.length);
	
	return Data.snippets.getUniqueFolder(name);
};

function observeList(list){
	var watchProperties = ["push", "pop", "shift", "unshift", "splice"],
		i = 0, len = watchProperties.length, prop;
	
	for(; i < len; i++){
		prop = watchProperties[i];
		
		Object.defineProperty(list, prop, {
			configurable: false,
			enumerable: false,
			writable: false,
			value: (function(prop){
				return function(){
					// do not use list[prop] because it is already overwritten
					// and so will lead to inifinite recursion						
					var ret = [][prop].apply(list, [].slice.call(arguments, 0));												
					Folder.setIndices();
					return ret; 
				};					
			})(prop)
		});
	}
}