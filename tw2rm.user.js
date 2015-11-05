// ==UserScript==
// @name        tw2rm
// @namespace   fxtm
// @description TeamWox to Redmine
// @version     1
// @grant       GM_openInTab
// @match https://tw.fxtm.com/tasks/view/*
// @match https://tw.fxtm.com/servicedesk/view/*
// @require     https://code.jquery.com/jquery-2.1.4.min.js
// ==/UserScript==

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

function addRedmineLink(){
    var tableRow = $('<td><a class="commands-panel-link with-image" style="background-image: url(\'https://redmine.fxtm/favicon.ico\');" href="javascript:void(0)" title="To redmine">To redmine</a></td>');
    var container = $('.head .commands table tr');
    console.log(container, tableRow);
    container.prepend(tableRow);
    return tableRow.find('a');
}

function getTwHost() {
    return window.location.protocol + "//" + window.location.host;
}

function getTwPostData() {

    return {
        title: $('.content-view-ext div.head div.title div.text').html(),
        self_link: getTwHost() + $('div.head div.details a.link').attr('href'),
        head_content: $('.content-view-ext div.body div.content').html(),
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
        var link = "{0}/projects/{1}/issues/new?".format(this.baseUrl, this.projectAlias);
        for (var f in this.fields) if (this.fields.hasOwnProperty(f)) {
            link += "&issue[{0}]={1}".format(f, encodeURIComponent(this.fields[f]));
        }

        return link;
    }
};

function htmlToTextile(html){
    // <img title="" src="/servicedesk/image/548690" style="vertical-align:middle;" height="995" width="2244">

    // 
    // console.log('html img', html);

    try {
        html = html.replace(/(<br>|<\/li>)/g, "\n");
        html = html.replace(/<\/p>/g, "\n\n");
        html = html.replace(/<li>/g, "* ");
        html = html.replace(/<p>(.)/g, "p. $1");
        html = html.replace(/(<b>|<\/b>)/g, "*");
        html = html.replace(/(<ul>|<\/ul>)/g, "");
        html = html.replace(/<img.*?src="([^"]+)".*?>/g, " !{max-width: 100%}{0}$1! ".format(getTwHost()));
        html = html.replace(/<.*?>/g, "");

        console.log('html', html);

        return html;

        var txt = $(html).text();

        return txt;
    } catch (e) {
        console.log('ERR:', e);
    }

    return ":(";
}

setTimeout(function(){
    var btn = addRedmineLink();

    btn.on('click', function(){
        var tw = getTwPostData(),
            rm = new RedmineLink('https://redmine.fxtm', 'web-development-department');

        console.log('tw', tw, 'rm', rm);

        rm.setFields({
            subject: tw.title,
            tracker_id: 4, // Task
            description: "TW: {0}\n\n{1}".format(tw.self_link, htmlToTextile(tw.head_content).replace(/^/mg, '> '))
        });
        // https://redmine.fxtm/projects/unixdp/issues/new?issue[subject]=Query&issue[assigned_to_id]=6&issue[tracker_id]=7&issue[description]=%3Cpre%3E%0D%0A%0D%0A%0D%0A%3C/pre%3E
        var linkText = rm.render();

        console.log(linkText);
        GM_openInTab(linkText, false);
    });
}, 1000);

console.log('tw2rm: ', window, $('body'));