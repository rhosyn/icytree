// Global variables
var treeFile = undefined;
var treeData = "";
var trees = [];
var currentTreeIdx = 0;
var controlsHidden = false;
var zoomControl = undefined;
var lineWidth = 2;

// Page initialisation code:
$(document).ready(function() {

    $(window).on("resize", update);

    // Set up drag and drop event listeners:
    $("#output").on("dragover", function(event) {
	event.preventDefault();
	return false;
    });
    $("#output").on("dragend", function(event) {
	event.preventDefault();
	return false;
    });
    $("#output").on("drop", dropInputHandler);

    // Set up keyboard handler:
    $(document).on("keypress", keyPressHandler);

    // Create new zoomControl object (don't initialise):
    zoomControl = Object.create(ZoomControl, {});


    // Menu item events:
    $("#fileEnter").click(directEntryDisplay);
    $("#fileReload").click(reloadTreeData);
    $("#fileExport").click(exportSVG);



    update();
});

function fileInputHandler() {
    treeFile = $("#fileInput").prop("files")[0];
    loadFile();
}

function directEntryDisplay(flag) {

    if (flag) {
	// Disable keypress event handler
	$(document).off("keypress", keyPressHandler);

	// Display input elements
	$("#directEntry").show(400);
    } else {
	// Hide input elements
	$("#directEntry").hide(400);

	// Enable keypress event handler
	$(document).on("keypress", keyPressHandler);
    }
}

function directEntryHandler() {
    treeData = document.getElementById("directEntryInput").value;

    reloadTreeData();
}

function dropInputHandler(event) {
    event.preventDefault();

    treeFile = event.dataTransfer.files[0];

    loadFile();
}

// Load tree data from file object treeFile
function loadFile() {
    var reader = new FileReader();
    reader.onload = fileLoaded;
    reader.readAsText(treeFile);

    function fileLoaded(evt) {
	treeData = evt.target.result;
	reloadTreeData();
    }

}

// Display space-filling frame with big text
function displayStartOutput() {

    var output = $("#output");

    output.removeClass();
    output.addClass("empty");
    output.html("");

    output.append(
	$("<img/>")
	    .attr("src", "icytree_start.svg")
	    .attr("height", "150")
    );

    // Pad to centre of page. (Wish I could do this with CSS!)
    var pad = Math.max(Math.floor((window.innerHeight-60-150)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);

}

function displayLoading() {

    var output = $("#output");

    output.removeClass();
    output.addClass("text");
    output.text("Loading...");

    // Pad to centre of page. (Wish I could do this with CSS!)
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);
}

function displayError(string) {

    var output = $("#output");

    output.removeClass();
    output.addClass("error");
    output.text(string);

    // Pad to centre of page. (Wish I could do this with CSS!)
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);

    setTimeout(function() {
	displayStartOutput();
    }, 4000);
}

// Clear all output element styles.
function prepareOutputForTree() {
    var output = $("#output");
    output.removeClass();
    output.css("padding", "0px");
}

// Display keyboard shortcut help
function keyboardShortcutHelpDisplay(flag) {

    if (flag) {
	// Disable keypress event handler
	$(document).off("keypress", keyPressHandler);

	// Display input elements
	$("#shortcutHelp").show(400);
    } else {
	// Hide input elements
	$("#shortcutHelp").hide(400);

	// Enable keypress event handler
	$(document).on("keypress", keyPressHandler);
    }
}

// Display about box
function aboutBoxDisplay(flag) {

    if (flag) {
	// Disable keypress event handler
	$(document).off("keypress");

	// Display input elements
	$("#about").show(400);
    } else {
	// Hide input elements
	$("#about").hide(400);

	// Enable keypress event handler
	$(document).on("keypress", keyPressHandler);
    }
}

// Update checked item in list:
function selectListItem(el) {

    // el is an <a> within the <li>
    var li = el.parentElement;
    var ul = li.parentElement;

    if (li.className === "checked")
	return;

    // Uncheck old selected element:
    ul.getElementsByClassName("checked")[0].className = "";

    // Check this element:
    li.className = "checked";

    // Update
    update();
}

// Cycle checked item in list:
function cycleListItem(selectorEl) {
    var checkedItemEl = selectorEl.getElementsByClassName("checked")[0];
    var nextItemEl = checkedItemEl.nextElementSibling;
    
    if (nextItemEl === null)
	nextItemEl = selectorEl.children[0];

    // selectListItem() expects <a> within the <li>
    selectListItem(nextItemEl.children[0]);
}

// Update form elements containing trait selectors
function updateTraitSelectors(tree) {
    
    var elementIDs = ["colourTraitSelector", "tipTextTraitSelector", "nodeTextTraitSelector"];
    for (var eidx=0; eidx<elementIDs.length; eidx++) {
        var el = document.getElementById(elementIDs[eidx]);
	
        // Save currently selected trait:
        var selectedTrait =  el.getElementsByClassName("checked")[0].children[0].text;
	
        // Clear old traits:
        el.innerHTML = "";
	
        // Selector-dependent stuff:
	// Colour selector only allows traits common to _all_ nodes on tree.
	// All other selectors include the node label as an option.

	var traitList = ["None"];
        if (elementIDs[eidx] === "colourTraitSelector") {
	    traitList = traitList.concat(tree.getTraitList(true));

	} else {
	    traitList.push("Node label");
	    traitList = traitList.concat(tree.getTraitList(false));
        }

	// Construct selector trait lists:
        for (var i=0; i<traitList.length; i++) {
            var selector = document.createElement("li");
	    var a = document.createElement("a");
	    a.setAttribute("href","#");
	    a.setAttribute("onclick", "selectListItem(this); return false;");
	    a.textContent = traitList[i];
	    selector.appendChild(a);
	    if (traitList[i] === selectedTrait)
		selector.className = "checked";
	    el.appendChild(selector);
        }

    }
}

// Alter line width used in visualisation.
function edgeThicknessChange(inc) {
    lineWidth = Math.max(1, lineWidth + inc);
    update();
}

// Increment currently-displayed tree.
function currentTreeInc(dir, big) {
    if (big)
	inc = dir*Math.round(trees.length/10)
    else
	inc = dir;
   
    currentTreeIdx = Math.max(0, currentTreeIdx+inc);
    currentTreeIdx = Math.min(trees.length-1, currentTreeIdx);

    update();
}

// Alter currently-displayed tree.
function currentTreeChange(newVal) {
    newVal = Number(newVal);
    if (Number.isNaN(newVal)) {
	updateCurrentTreeControl();
	return;
    }
	
    currentTreeIdx = Math.max(0, Number(newVal)-1);
    currentTreeIdx = Math.min(trees.length-1, currentTreeIdx);

    update();
}

// Ensure current tree index is within bounds,
// keeps "spin control" up to date and alters
// visibility of control depending on number of
// trees in current list.
function updateCurrentTreeControl() {

    if (currentTreeIdx>trees.length-1)
	currentTreeIdx = trees.length-1;
    else if (currentTreeIdx<0)
	currentTreeIdx = 0;

    if (currentTreeIdx<=0) {
	document.getElementById("prevTree").disabled = true;
	document.getElementById("firstTree").disabled = true;
    } else {
	document.getElementById("prevTree").disabled = false;
	document.getElementById("firstTree").disabled = false;
    }

    if (currentTreeIdx>=trees.length-1) {
	document.getElementById("nextTree").disabled = true;
	document.getElementById("lastTree").disabled = true;
    } else {
	document.getElementById("nextTree").disabled = false;
	document.getElementById("lastTree").disabled = false;
    }

    var selectEl = document.getElementById("treeSelect");
    var counterEl = document.getElementById("treeCounter");

    if (trees.length>1) {
	selectEl.style.display = "block";
	counterEl.textContent = "Tree number: " +
	(currentTreeIdx+1) + " of " + trees.length;

	var setTreeEl = document.getElementById("setTree");
	setTreeEl.value = currentTreeIdx+1;
	setTreeEl.size = String(trees.length).length;
    } else {
	selectEl.style.display = "none";
    }
}

// Update object representation of tree data from string
function reloadTreeData() {

    if (treeData.replace(/\s+/g,"").length === 0) {
        trees = [];
	update();
	return;
    }

    treeData = treeData.replace(/&amp;/g,"&");

    if (treeData.length>500000) {

	// Parse large data set asynchronously and display loading screen
	
	displayLoading();

	setTimeout(function() {

	    try {
		trees = getTreesFromString(treeData);
	    } catch (e) {
		displayError("Error parsing tree data!");
		console.log(e);
		return;
	    }
	    
	    console.log("Successfully parsed " + trees.length + " trees.");
	    update();
	}, 300);
    } else {

	// Parse small data set NOW. (No loading screen.)

	try {
	    trees = getTreesFromString(treeData);
	} catch (e) {
	    displayError("Error parsing tree data!");
	    console.log(e);
	    return;
	}
	    
	console.log("Successfully parsed " + trees.length + " trees.");
	update();
    }
}

// Converts SVG in output element to data URI for saving
function exportSVG() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
	return false;

    var dataURI = "data:image/svg+xml;base64," + window.btoa($("#output").html());
    window.open(dataURI);
}

// Update display according to current tree model and display settings
function update() {

    // Update tree index selector:
    updateCurrentTreeControl();

    if (trees.length === 0) {
	displayStartOutput();
	return;
    } else {
	prepareOutputForTree();
    }

    // Generate _copy_ of tree to draw.
    // (Allows us to revert sorting operation.)
    var tree = trees[currentTreeIdx].copy();

    // Sort tree nodes
    switch ($("#styleSort .checked > a").text()) {
    case "Ascending":
        tree.sortNodes(false);
	break;
    case "Descending":
        tree.sortNodes(true);
	break;
    default:
	break;
    }

    // Update trait selectors:
    updateTraitSelectors(tree);
    
    // Determine whether colouring is required:
    var colourTrait = undefined;
    var colourTraitEl = document.getElementById("colourTraitSelector").getElementsByClassName("checked")[0];
    if (colourTraitEl.textContent !== "None") {
	colourTrait = colourTraitEl.textContent;
    }
    
    // Determine whether tip labels are required:
    var tipTextTrait = undefined;
    var tipTextTraitEl = document.getElementById("tipTextTraitSelector").getElementsByClassName("checked")[0];
    if (tipTextTraitEl.textContent !== "None") {
	if (tipTextTraitEl.textContent === "Node label")
	    tipTextTrait = "label";
	else
	    tipTextTrait = tipTextTraitEl.textContent;
    }

    // Determine whether internal node labels are required:
    var nodeTextTrait = undefined;
    var nodeTextTraitEl = document.getElementById("nodeTextTraitSelector").getElementsByClassName("checked")[0];
    if (nodeTextTraitEl.textContent !== "None") {
	if (nodeTextTraitEl.textContent === "Node label")
	    nodeTextTrait = "label";
	else
	    nodeTextTrait = nodeTextTraitEl.textContent;
    }

    // Determine whether internal nodes should be marked:
    var markSingletonNodes = document.getElementById("markSingletonNodes").checked;

    // Determine whether axis should be displayed:
    var showAxis = document.getElementById("axis").checked;

    // Determine whether anti-aliasing should be used:
    var antialias = document.getElementById("antialias").checked;

    // Create layout object:
    var layout = Object.create(Layout).init(tree).standard();
    
    // Assign chosen layout properties:

    var controlsOffset;
    controlsOffset = 0;

    layout.width = Math.max(window.innerWidth-controlsOffset-5, 200);
    layout.height = Math.max(window.innerHeight-5, 200);
    layout.colourTrait = colourTrait;
    layout.tipTextTrait = tipTextTrait;
    layout.nodeTextTrait = nodeTextTrait;
    layout.markSingletonNodes = markSingletonNodes;
    layout.axis = showAxis;
    layout.lineWidth = lineWidth;

    // Use existing zoom control instance:
    layout.zoomControl = zoomControl;

    // Display!
    $("#output").html("");
    var svg = layout.display();
    svg.setAttribute("id", "SVG");
    if (!antialias)
	svg.style.shapeRendering = "crispEdges";
    $("#output").append(svg);
}

// Keyboard event handler:
function keyPressHandler(event) {

    if (event.target !== document.body)
	return;

    var char = String.fromCharCode(event.charCode);

    if (char == "?") {
	// Keyboard shortcut help
	keyboardShortcutHelpDisplay(true);
    }

    if (trees.length == 0)
	return;

    switch(char) {
    case "r":
	// Reload:
	loadFile();
	break;

    case "t":
	// Cycle tip text:
	cycleListItem(document.getElementById("tipTextTraitSelector"));
	break;

    case "i":
	// Cycle internal node text:
	cycleListItem(document.getElementById("nodeTextTraitSelector"));
	break;

    case "c":
	// Cycle branch colour:
	cycleListItem(document.getElementById("colourTraitSelector"));
	break;

    case "m":
	// Toggle marking of internal nodes:
	var checkbox = document.getElementById("markSingletonNodes")
	checkbox.checked = !checkbox.checked;
	update();
	break;

    case "a":
	// Toggle axis display
	var checkbox = document.getElementById("axis")
	checkbox.checked = !checkbox.checked;
	update();
	break;

    case "z":
	// Reset zoom.
	zoomControl.reset();
	break;

    case ".":
	// Next tree
	currentTreeInc(1, false);
	break;

    case ",":
	// Prev tree
	currentTreeInc(-1, false);
	break;

    case ">":
	// Fast-forward tree 
	currentTreeInc(1, true);
	break;

    case "<":
	// Fast-backward tree
	currentTreeInc(-1, true);
	break;

    case "+":
    case "=":
	// Increase line thickness
	edgeThicknessChange(1);
	break;

    case "-":
	// Decrease line thickness
	edgeThicknessChange(-1);
	break;

    default:
	break;
    }
}

