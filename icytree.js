/**
 * @licstart  The following is the entire license notice for the 
 *  JavaScript code in this page.
 *
 * Copyright (C) 2014  Tim Vaughan
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 */

// Global variables
var treeFile = undefined;
var treeData = "";
var trees = [];
var currentTreeIdx = 0;
var controlsHidden = false;
var zoomControl = undefined;
var lineWidth = 2;
var fontSize = 11;
var defaultBranchLength = 1; // Branch length used when none specified

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
    $("#output").on("drop", function (event) {
        event.preventDefault();
        treeFile = event.originalEvent.dataTransfer.files[0];
        loadFile();
    });

    // Set up keyboard handler:
    $(document).on("keypress", keyPressHandler);

    // Create new zoomControl object (don't initialise):
    zoomControl = Object.create(ZoomControl, {});

    // Set up dialogs:


    // Set up menus:
    $("#menu > li > button").button();

    $("#fileMenu").menu().hide();
    $("#styleMenu").menu().hide();
    $("#searchMenu").menu().hide();
    $("#helpMenu").menu().hide();

    $("#menu > li").mouseover(function() {
        $(this).find(".menuDiv > ul").show();
    });

    $("#menu > li").mouseout(function() {
        $(this).find(".menuDiv > ul").hide();
    });

    // Menu item events:

    $("#directEntry").dialog({
        autoOpen: false,
        modal: true,
        width: 500,
        height: 400,
        buttons: {
            Done: function() {
                treeData = $(this).find("textArea").val();
                reloadTreeData();
                $(this).dialog("close");
            },
            Clear: function() {
                $(this).find("textArea").val("");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });
                  
    $("#fileEnter").click(function() {
        $("#directEntry").dialog("open");
        var textBox = $("#directEntry").find("textArea");
        textBox.focus()
        textBox.select()
    });
    $("#fileLoad").click(function() {
        // Clear file input (otherwise can't reload same file)
        $("#fileInput").replaceWith($("#fileInput").clone(true));

        // Trigger click on file input
        if (!$(this).parent().hasClass("ui-state-disabled"))
            $("#fileInput").trigger("click");
    });
    $("#fileInput").change(function() {
        treeFile = $("#fileInput").prop("files")[0];
        loadFile();
    });
    $("#fileReload").click(reloadTreeData);
    $("#fileExportSVG").click(exportSVG);


    $("#multiSVGDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        height: 300,
        buttons: {
            Export: function() {
                exportSVGMulti($("#multiSVGspinner").spinner().spinner("value"));
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });
    $("#fileExportSVGMulti").click(function() {
        $("#multiSVGspinner").spinner().spinner("value",2);
        $("#multiSVGDialog").dialog("open");
    });

    $("#fileExportNewick").click(exportNewick);
    $("#fileExportNEXUS").click(exportNEXUS);

    $("#styleSort").on("click", "a", function() {
        selectListItem($(this));
    });
    $("#styleColourTrait").on("click", "a", function() {
        selectListItem($(this));
    });
    $("#styleTipTextTrait").on("click", "a", function() {
        selectListItem($(this));
    });
    $("#styleNodeTextTrait").on("click", "a", function() {
        selectListItem($(this));
    });
    $("#styleFontSize").on("click", "a", function() {
        if ($(this).text() === "Increase")
            fontSizeChange(2);
        else
            fontSizeChange(-2);
    });
    $("#styleEdgeThickness").on("click", "a", function() {
        if ($(this).text() === "Increase")
            edgeThicknessChange(1);
        else
            edgeThicknessChange(-1);
    });

    $("#styleMarkSingletons").click(function() {
        toggleItem($(this));
    });
    $("#styleDisplayAxis").click(function() {
        toggleItem($(this));
    });
    $("#styleLogScale").click(function() {
        toggleItem($(this));
    });
    $("#styleAntiAlias").click(function() {
        toggleItem($(this));
    });


    $("#nodeSearchDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Search: function() {

                var tree = trees[currentTreeIdx];

                var searchStrings = $("#searchStringInput").val().split(",");
                var akey = $("#searchAnnotationKey").val();
                var highlightType = $("input[name=searchOpt]:checked", "#nodeSearchDialog").val();

                // Clear existing highlights
                $.each(tree.getNodeList(), function(nidx, node) {
                    delete node.annotation[akey];
                });

                $.each(searchStrings, function(eidx, str) {
                    var matchVal = eidx+1;
                    
                    // Find matching nodes
                    var matchingNodes = [];
                    $.each(tree.getNodeList(), function(nidx, node) {
                        if (node.label.search(str)>=0)
                            matchingNodes = matchingNodes.concat(node)
                    });

                    // Highlight additional nodes as required

                    if (highlightType === "monophyletic")
                        matchingNodes = tree.getCladeNodes(matchingNodes);

                    if (highlightType === "ancestors")
                        matchingNodes = tree.getAncestralNodes(matchingNodes);

                    // Annotate selected nodes
                    $.each(matchingNodes, function (nidx, node) {
                        node.annotation[akey] = matchVal;
                    });

                });

                updateTraitSelectors(tree);

                // Colour tree using highlighting trait
                var hlElement = undefined;
                $("#styleColourTrait a").each(function(eidx) {
                    if ($(this).text() === akey)
                        hlElement = $(this);
                });
                selectListItem(hlElement);

                update();

                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }}
    });
    $("#searchNodes").click(function() {
        if (trees.length>currentTreeIdx && currentTreeIdx>=0)
            $("#nodeSearchDialog").dialog("open");
    });

    $("#searchClear").click(function() {
        if (trees.length>currentTreeIdx && currentTreeIdx>=0) {
            var tree = trees[currentTreeIdx];
            var akey = $("#searchAnnotationKey").val();
            $.each(tree.getNodeList(), function(nidx, node) {
                delete node.annotation[akey];
            });

            var noneElement = $($("#styleColourTrait a")[0]);
            selectListItem(noneElement);

            update();
        }
    });

    $("#shortcutHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });
    $("#helpShortcuts").click(function() {
        $("#shortcutHelp").dialog("open");
    });

    $("#navHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });
    $("#helpNav").click(function() {
        $("#navHelp").dialog("open");
    });

    $("#about").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });
    $("#helpAbout").click(function() {
        $("#about").dialog("open");
    });

    $("#warning").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "I understand": function() {
                $(this).dialog("close");
            }}
    });

    update();

    // Display warning if required functions unavailable.
    if (!browserValid()) {
        $("#warning").dialog("open");
    }
});

// Tests for the presence of requried browser functionaility
function browserValid() {
    if (typeof FileReader === "undefined") {
        // Can't load files
        $("#fileLoad").parent().addClass("ui-state-disabled");
        return false;
    }

    return true;
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
    output.addClass("start");
    output.html("");

    var imgHeight = 150;
    var imgWidth = 368;
    output.append(
        $("<img/>")
            .attr("src", "icytree_start.svg")
            .attr("height", imgHeight)
    );

    // Pad to centre of page.
    var pad = Math.max(Math.floor((window.innerHeight-60-imgHeight)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);

    pad = Math.max(Math.floor((window.innerWidth-50-imgWidth)/2), 0) + "px";
    output.css("paddingLeft", pad);
    output.css("paddingRight", pad);

    output.css("width", imgWidth+"px");
    output.css("height", imgHeight+"px");

}

function displayLoading() {

    var output = $("#output");

    output.removeClass();
    output.addClass("loading");
    output.text("Loading...");

    // Pad to centre of page. (Wish I could do this with CSS!)
    output.css("width", Math.max(Math.floor(window.innerWidth-50), 0) + "px");
    output.css("height", "100px");
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);
    output.css("paddingLeft", "0px");
    output.css("paddingRight", "0px");
}

function displayError(string) {

    var output = $("#output");

    output.removeClass();
    output.addClass("error");
    var divMainStr = "<div class='main'>Could not load tree!</div>"
    var divMinorStr = "<div class='minor'>" + string + "</div>"
    output.html(divMainStr + divMinorStr);

    // Pad to centre of page. (Wish I could do this with CSS!)
    output.css("width", Math.max(Math.floor(window.innerWidth-50), 0) + "px");
    output.css("height", "100px");
    var pad = Math.max(Math.floor((window.innerHeight-60-100)/2), 0) + "px";
    output.css("paddingTop", pad);
    output.css("paddingBottom", pad);
    output.css("paddingLeft", "0px");
    output.css("paddingRight", "0px");

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

// Update checked item in list:
function selectListItem(el) {

    // el is an <a> within the <li>
    var li = el.parent();
    var ul = li.parent();

    if (el.find("span").length>0)
        return;

    // Uncheck old selected element:
    ul.find("span").remove();

    // Check this element:
    $("<span/>").addClass("ui-icon ui-icon-check").prependTo(el);

    // Update
    update();
}

// Cycle checked item in list:
function cycleListItem(el) {

    // el is <ul>
    var currentItem = el.find("span").closest("li");
    if (currentItem.is(el.find("li").last()))
        selectListItem(el.find("li").first().children());
    else
        selectListItem(currentItem.next().children());
}

function toggleItem (el) {
    if (el.find("span").length===0) {
        el.prepend($("<span/>").addClass("ui-icon ui-icon-check"));
    } else {
        el.find("span").remove();
    }
    
    update();
}

// Update form elements containing trait selectors
function updateTraitSelectors(tree) {
    
    var elements = [$("#styleColourTrait"),
                    $("#styleTipTextTrait"),
                    $("#styleNodeTextTrait")];

    $.each(elements, function (eidx, el) {
        
        // Save currently selected trait:
        var selectedTrait =  el.find("span").parent().text();
        
        // Clear old traits:
        el.html("");
        
        // Obtain trait list:
        var traitList = ["None", "Node label"];
        traitList = traitList.concat(tree.getTraitList(false));

        // Construct selector trait lists:
        for (var i=0; i<traitList.length; i++) {
            var selector = $("<li />");
            var a = $("<a/>").attr("href","#").text(traitList[i]);
            selector.append(a);
            if (traitList[i] === selectedTrait)
                $("<span/>").addClass("ui-icon ui-icon-check").prependTo(a);
            el.append(selector);
        }
        
    });

    $("#styleMenu").menu("refresh");
}

// Alter line width used in visualisation.
function edgeThicknessChange(inc) {
    lineWidth = Math.max(1, lineWidth + inc);
    update();
}

// Alter font size used in visualisation.
function fontSizeChange(inc) {
    fontSize = Math.max(6, fontSize + inc);
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
    if (String(newVal) === "NaN") {
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

    // Clear existing trees
    trees = [];

    // Early check for empty tree data
    if (treeData.replace(/\s+/g,"").length === 0) {
        update();
        return;
    }

    treeData = treeData.replace(/&amp;/g,"&");

    if (treeData.length>500000) {

        // Parse large data set asynchronously and display loading screen
        
        displayLoading();

        setTimeout(function() {

            try {
                trees = getTreesFromString(treeData, defaultBranchLength);
            } catch (e) {
                displayError(e);
                console.log(e);
                return;
            }
            
            console.log("Successfully parsed " + trees.length + " trees.");
            update();
        }, 300);
    } else {

        // Parse small data set NOW. (No loading screen.)

        try {
            trees = getTreesFromString(treeData, defaultBranchLength);
        } catch (e) {
            displayError(e);
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

    var blob = new Blob([$("#output").html()], {type: "image/svg+xml"});
    saveAs(blob, "tree.svg");
}

function exportSVGMulti(pages) {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var svgEl = $("#output > svg")[0];

    // Get full width and height
    var width = svgEl.getAttribute("width");
    var height = svgEl.getAttribute("height");

    // Height to use for each page
    var imageHeight = height/pages;

    // Record current viewbox
    var vbx = svgEl.viewBox.baseVal.x;
    var vby = svgEl.viewBox.baseVal.y;
    var vbwidth = svgEl.viewBox.baseVal.width;
    var vbheight = svgEl.viewBox.baseVal.height;

    // Record current zoom:
    var zoomFactorX = zoomControl.zoomFactorX;
    var zoomFactorY = zoomControl.zoomFactorY;

    // Initialise viewbox and zoom for images
    var newvbx = 0;
    var newvbwidth = width;
    var newvbheight = imageHeight;
    zoomControl.zoomFactorX = 1
    zoomControl.zoomFactorY = pages;

    for (var i=0; i<pages; i++) {

        // Set viewbox location
        var newvby = i*imageHeight;

        // Update viewbox
        svgEl.setAttribute("viewBox", newvbx + " " + newvby + " "
                              + newvbwidth + " " + newvbheight);
        
        // Hack to ensure text looks okay
        zoomControl.updateTextScaling();

        // Save image
        var blob = new Blob([$("#output").html()], {type: "image/svg+xml"});
        saveAs(blob, "tree_part" + i + ".svg");
    }

    // Revert to original viewbox and zoom
    svgEl.setAttribute("viewBox", vbx + " " + vby + " "
                       + vbwidth + " " + vbheight);
    zoomControl.zoomFactorX = zoomFactorX;
    zoomControl.zoomFactorY = zoomFactorY;
    zoomControl.updateTextScaling();
}

// Export trees to file in Newick format
function exportNewick() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var newickStr = trees[currentTreeIdx].getNewick() + "\n";
    var blob = new Blob([newickStr], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "tree.newick");
}

// Export trees to file in NEXUS format
function exportNEXUS() {
    if (currentTreeIdx>=trees.length || currentTreeIdx<0)
        return false;

    var nexusStr = "#nexus\n\nbegin trees;\ntree tree_1 = [&R] "
        + trees[currentTreeIdx].getNewick(true) + "\n"
        + "end;\n";

    var blob = new Blob([nexusStr], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "tree.nexus");
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
    switch ($("#styleSort span").parent().text()) {
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
    var colourTrait = $("#styleColourTrait span").parent().text();
    if (colourTrait === "None")
        colourTrait = undefined;
    
    // Determine whether tip labels are required:
    var tipTextTrait = $("#styleTipTextTrait span").parent().text();
    switch (tipTextTrait) {
    case "None":
        tipTextTrait = undefined;
        break;
    case "Node label":
        tipTextTrait = "label";
        break;
    default:
        break;
    }

    // Determine whether internal node labels are required:
    var nodeTextTrait = $("#styleNodeTextTrait span").parent().text();
    switch (nodeTextTrait) {
    case "None":
        nodeTextTrait = undefined;
        break;
    case "Node label":
        nodeTextTrait = "label";
        break;
    default:
        break;
    }

    // Create layout object:
    var layout = Object.create(Layout).init(tree);
    layout.logScale = ($("#styleLogScale > span").length>0);
    layout.standard();
    
    // Assign chosen layout properties:
    layout.width = Math.max(window.innerWidth-5, 200);
    layout.height = Math.max(window.innerHeight-5, 200);
    layout.colourTrait = colourTrait;
    layout.tipTextTrait = tipTextTrait;
    layout.nodeTextTrait = nodeTextTrait;
    layout.markSingletonNodes = ($("#styleMarkSingletons > span").length>0);
    layout.axis = ($("#styleDisplayAxis > span").length>0);
    layout.lineWidth = lineWidth;
    layout.fontSize = fontSize;

    // Use existing zoom control instance:
    layout.zoomControl = zoomControl;

    // Display!
    $("#output").html("");
    var svg = layout.display();
    svg.setAttribute("id", "SVG");
    if ($("#styleAntiAlias > span").length==0)
        svg.style.shapeRendering = "crispEdges";
    $("#output").append(svg);
}

// Keyboard event handler:
function keyPressHandler(event) {

    if (event.target !== document.body)
        return;

    var char = String.fromCharCode(event.charCode);

    // Presses valid at all times:

    switch (char) {
    case "?":
        // Keyboard shortcut help
        $("#shortcutHelp").dialog("open");
        event.preventDefault();
        return;

    case "e":
        // Enter trees directly
        $("#fileEnter").trigger("click");
        event.preventDefault();
        return;

    case "l":
        // Load trees from file
        $("#fileLoad").trigger("click");
        event.preventDefault();
        return;

    case "r":
        // Reload:
        loadFile();
        break;
    }

    if (trees.length == 0)
        return;

    // Presses valid only when a tree is displayed:

    switch(char) {
    case "t":
        // Cycle tip text:
        cycleListItem($("#styleTipTextTrait"));
        event.preventDefault();
        return;

    case "i":
        // Cycle internal node text:
        cycleListItem($("#styleNodeTextTrait"));
        event.preventDefault();
        return;

    case "c":
        // Cycle branch colour:
        cycleListItem($("#styleColourTrait"));
        event.preventDefault();
        return;

    case "m":
        // Toggle marking of internal nodes:
        toggleItem($("#styleMarkSingletons"));
        event.preventDefault();
        return;

    case "a":
        // Toggle axis display
        toggleItem($("#styleDisplayAxis"));
        event.preventDefault();
        return;

    case "s":
        // Toggle log scale
        toggleItem($("#styleLogScale"));
        event.preventDefault();
        return;

    case "z":
        // Reset zoom.
        zoomControl.reset();
        event.preventDefault();
        return;

    case ".":
        // Next tree
        currentTreeInc(1, false);
        event.preventDefault();
        return;

    case ",":
        // Prev tree
        currentTreeInc(-1, false);
        event.preventDefault();
        return;

    case ">":
        // Fast-forward tree 
        currentTreeInc(1, true);
        event.preventDefault();
        return;

    case "<":
        // Fast-backward tree
        currentTreeInc(-1, true);
        event.preventDefault();
        return;

    case "+":
    case "=":
        // Increase line thickness
        edgeThicknessChange(1);
        event.preventDefault();
        return;

    case "-":
        // Decrease line thickness
        edgeThicknessChange(-1);
        event.preventDefault();
        return;

    case "]":
        // Increase font size
        fontSizeChange(2);
        event.preventDefault();
        return;

    case "[":
        // Decrease font size
        fontSizeChange(-2);
        event.preventDefault();
        return;

    default:
        break;
    }
}


