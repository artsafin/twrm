// ==UserScript==
// @name        tw2rm
// @namespace   fxtm
// @description TeamWox to Redmine
// @version     2
// @grant       GM_openInTab
// @grant       GM_getResourceURL
// @grant       unsafeWindow
// @match https://tw.fxtm.com/tasks/view/*
// @match https://tw.fxtm.com/servicedesk/view/*
// @require     https://code.jquery.com/jquery-2.1.4.min.js
// @resource redmineIcon https://redmine.fxtm/favicon.ico
// ==/UserScript==

var CFG = {
    twUrl: "https://tw.fxtm.com",
    redmineUrl: "https://redmine.fxtm",
    redmineProject: "web-development-department"
};

this.$ = this.jQuery = jQuery.noConflict(true);

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function createRedmineLink(){
    var iconUrl = GM_getResourceURL('redmineIcon'),
        tableRow = $('<td><a class="commands-panel-link with-image" '
            + 'style="position: relative; z-index: 1001; background-image: url(\'{0}\'); background-size: 16px;" '.format(iconUrl)
            + 'href="javascript:void(0)" '
            + 'title="To redmine">'
                + 'To redmine'
            + '</a></td>');

    return tableRow;
}

function createPanel() {
    var style = 'z-index: 1000; position: absolute; right: 0; border: 0; border-radius: 5px; box-shadow: 0px 0px 20px 0 #dedbcd; display: none; width: 260px; height: 530px;';
    console.log('createPanel');
    var src = 
            '<html>'
            + '<head>'
            + '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">'
            + '<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>'
            + '<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js" integrity="sha384-0mSbJDEHialfmuBBQP6A4Qrprq5OVfW37PRR3j5ELqxss1yVqOtnepnHVP9aJ7xS" crossorigin="anonymous"></script>'
            + '</head>'
            + '<body style="padding: 0.5em; background-color: #f8f7f3; margin-top: 2em;">'
+ '<form id="form">'
+ '<h5>Tracker</h5>'
+ '<div class="btn-group" data-toggle="buttons" role="group">'
  + '<label class="btn btn-default active">'
  + '<input type="radio" name="tracker_id" value="4" autocomplete="off" checked>Task'
  + '</label>'
  + '<label class="btn btn-default">'
    + '<input type="radio" name="tracker_id" value="1" autocomplete="off">Bug'
  + '</label>'
+ '</div>'
+ '<hr>'
+ '<h5>Team</h5>'
+ '<div class="list-group">'
+ '  <button type="submit" name="assign_to" value="0" class="list-group-item">None</button>'
+ '  <button type="submit" name="assign_to" value="134" class="list-group-item">Backoffice Team</button>'
+ '  <button type="submit" name="assign_to" value="140" class="list-group-item">Frontend Team</button>'
+ '  <button type="submit" name="assign_to" value="142" class="list-group-item">Drupal Team</button>'
+ '  <button type="submit" name="assign_to" value="137" class="list-group-item">Partnership Team</button>'
+ '  <button type="submit" name="assign_to" value="139" class="list-group-item">CRM Team</button>'
+ '  <button type="submit" name="assign_to" value="138" class="list-group-item">Dealing Team</button>'
+ '  <button type="submit" name="assign_to" value="141" class="list-group-item">Investments Team</button>'
+ '</div>'
+ '</form>'
+ '<script>var f = $("#form"); f.find(":submit").click(function(e){e.preventDefault(); var d = {"issue[tracker_id]": f.find("[name=tracker_id]:checked").val(), "issue[assigned_to_id]": e.target.value}; window.parent.postMessage(d, "*"); })'
+ '</script>'
            + '</body></html>';

    return $('<iframe style=\'{0}\' srcdoc=\'{1}\'></iframe>'.format(style, src));
}

function getTwHost() {
    return window.location.protocol + "//" + window.location.host;
}

function getSelectionContext() {
    var selection = window.getSelection();
    if (selection.rangeCount <= 0) {
        return null;
    }

    var range = selection.getRangeAt(0);

    if (range.startOffset == range.endOffset) {
        return null;
    }

    console.log('range', range);

    var startEl = $(range.startContainer);
    var commentItemEl = startEl.closest('div.item');
    var selectionLink = commentItemEl.length ? commentItemEl.find('.head a.link') : startEl.find('div.item').prev('div.item').find('.head a.link');

    var clonedSelection = range.cloneContents();
    var div = document.createElement('div');
    div.appendChild(clonedSelection);

    return {
        linkName: selectionLink.text(),
        href: selectionLink.attr('href'),
        html: div.innerHTML
    };
}

function getTwPostData() {

    return {
        title: $('.content-view-ext div.head div.title div.text').html(),
        self_link: getTwHost() + $('div.head div.details a.link').attr('href'),
        head_content: $('.content-view-ext div.body div.content').html(),
        sel: getSelectionContext() || {}
    };
}

function RedmineLink(baseUrl, projectAlias) {
    this.baseUrl = baseUrl;
    this.projectAlias = projectAlias;
    this.fields = {};
}
RedmineLink.prototype = {
    setFields: function(fields){
        this.fields = fields;
    },
    setField: function(f, v) {
        this.fields[f] = v;
    },
    render: function() {
        var link = "{0}/projects/{1}/issues/new?".format(this.baseUrl, this.projectAlias)
            + $.param(this.fields);

        return link;
    }
};

function htmlToTextile(html){
    try {
        html = html.replace(/(<br>|<\/li>)/g, "\n");
        html = html.replace(/<\/p>/g, "\n\n");
        html = html.replace(/<li>/g, "* ");
        html = html.replace(/<p>(.)/g, "p. $1");
        html = html.replace(/(<b>|<\/b>)/g, "*");
        html = html.replace(/(<ul>|<\/ul>)/g, "");
        html = html.replace(/<img.*?src="([^"]+)".*?>/g, " !{0}$1! ".format(getTwHost()));
        html = html.replace(/<.*?>/g, "");

        return html;

        var txt = $(html).text();

        return txt;
    } catch (e) {
        console.log('ERR:', e);
    }

    return ":(";
}

var panelToggler = null;

function redminize() {
    var container = $('.head .commands table tr'),
        redminizedLinkCell = createRedmineLink(),
        redminizedLink = redminizedLinkCell.find('a');

    container.prepend(redminizedLinkCell);

    var panel = createPanel();
    redminizedLinkCell.append(panel);

    panelToggler = function(){
        panel.slideToggle(100);
    };

    redminizedLink
        .on('click.twrm', panelToggler)
        .one("remove", function () {
            console.log('cleanup - link');
            redminizedLink.off('.twrm');
        });

    $('div.page_numerator a')
        .on('click.twrm', function(){
            setTimeout(redminize, 1000);
        })
        .one('remove', function(){
            console.log('cleanup - a');
            $(this).off('.twrm');
        });
}

function openRedmineWithParams(tw, overrideParams) {
    var rm = new RedmineLink(CFG.redmineUrl, CFG.redmineProject);

    var description = htmlToTextile(tw.sel.html || tw.head_content).replace(/^/mg, '> ');
    var twLink = tw.sel.href ? "TW post @{0}@: {1}".format(tw.sel.linkName, tw.sel.href) : "TW: {0}".format(tw.self_link);

    rm.setFields($.extend({
        "issue[subject]": tw.title,
        "issue[tracker_id]": 4, // Task
        "issue[description]": twLink + "\n\n" + description,
        "issue[custom_field_values]": {
            "1": tw.sel.href || tw.self_link
        }
    }, overrideParams || {}));
    var linkText = rm.render();
    
    GM_openInTab(linkText, false);
}

window.addEventListener("message", function(event) {
    var origin = event.origin || event.originalEvent.origin;
    if (origin != CFG.twUrl) {
        return;
    }

    var tw = getTwPostData();
    openRedmineWithParams(tw, event.data);

    panelToggler();
}, false);

setTimeout(function(){
    redminize();
}, 1000);

console.log('tw2rm v.2');