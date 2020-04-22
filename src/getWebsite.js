/**
 * @format
 * @flow strict-local
 * @typechecks
 */

var getParagraphsWithElements = require("./getParagraphs")
  .getParagraphsWithElements;
var DOMParser = require("xmldom").DOMParser;
var fs = require("fs");

var request = require("request");

function getRss(rss: string) {
  var contents = fs.readFileSync(rss, "utf8");
  var doc = new DOMParser().parseFromString(contents);
  var items = doc.getElementsByTagName("link");
  for (var item in items) {
    if (items[item].childNodes != null) {
      const weblink = items[item].childNodes[0].nodeValue;
      getWebsite(weblink);
    }
  }
}

function getWebsite(website: string) {
  request(
    {
      uri: website
    },
    function(error, response, body) {
      var doc = new DOMParser().parseFromString(body);
      if (doc == null) {
        return;
      }

      var body =
        doc.getElementsByTagName("body")[0] ||
        doc.getElementsByTagName("BODY")[0];

      var title =
        doc.getElementsByTagName("title")[0] ||
        doc.getElementsByTagName("TITLE")[0];

      var nodes = body.childNodes;

      var paragraphs = getParagraphsWithElements(nodes).map(paragraph =>
        paragraph.replace("\n\n", "</p>\n<p>")
      );

      paragraphs.forEach(paragraph => {
        for (let i = 0; i < paragraph.length; i++) {
          if (paragraph.charCodeAt(i) > 255) {
            throw new Error(
              "unexpected character code: https://www.codetable.net/decimal/" +
                paragraph.charCodeAt(i) +
                " -- " +
                paragraph
            );
          }
        }
      });

      var title = title.firstChild.nodeValue;

      var header =
        "<html><head><title>" +
        title +
        "</title></head><body><p>" +
        title +
        "</p><p>";

      var footer = "</p></body></html>";

      var content =
        header + paragraphs.join("\n</p>\n<mbp:pagebreak />\n<p>\n") + footer;

      var destFileName =
        "/Users/dmueller39/webarticles/" +
        title.replace(/[\W_]+/g, "_") +
        ".html";

      fs.writeFileSync(destFileName, content, "utf8");

      console.log(title, destFileName);
    }
  );
}

module.exports.getWebsite = getWebsite;
module.exports.getRss = getRss;
