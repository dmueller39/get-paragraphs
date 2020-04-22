var getParagraphsWithElements = require("./getParagraphs")
  .getParagraphsWithElements;
var getParagraphsWithText = require("./getParagraphs").getParagraphsWithText;
var getWebsite = require("./getWebsite").getWebsite;
var getRss = require("./getWebsite").getRss;
var fs = require("fs");
var DOMParser = require("xmldom").DOMParser;

var fileName = process.argv.slice(2)[0];

if (fileName == "--rss") {
  fileName = process.argv.slice(3)[0];
  getRss(fileName);
} else if (fileName.startsWith("http")) {
  getWebsite(fileName, "/Users/dmueller39/output.html");
} else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
  var contents = fs.readFileSync(fileName, "utf8");
  var doc = new DOMParser().parseFromString(contents);

  var nodes = doc.getElementsByTagName("body")[0].childNodes;

  var paragraphs = getParagraphsWithElements(nodes);
  console.log(paragraphs.join("\n</p>\n<mbp:pagebreak />\n<p>\n"));
} else if (fileName.endsWith(".txt")) {
  var contents = fs.readFileSync(fileName, "utf8");
  var paragraphs = getParagraphsWithText(contents);
  console.log(paragraphs.join("\n&&&&&&&&&&&&&&&&\n"));
}
