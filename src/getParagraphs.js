/**
 * @format
 * @flow strict-local
 * @typechecks
 */

type BreakingLocation = {
  start: number,
  end: number,
  needle: string,
};

const MULTI_SPACE_REGEX = new RegExp("\\s+", "g");
const MULTI_NEWLINE_REGEX = new RegExp("[\\n\\r]{4,}", "g");
const CARRIAGE_NEWLINE_REGEX = new RegExp("\\n\\r", "g");
const MINIMUM_STEP = 200;
const MAXIMUM_STEP = 600;
const MINIMUM_STEP_2 = 100;
const MAXIMUM_STEP_2 = 700;
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";
const HONORIFICS = ["St", "Mr", "Ms", "Mrs", "Dr", "Prof"];
const CHARACTER_MAP = [
  ["ś", "s"],
  ["ć", "c"],
  ["ó", "o"],
  ["ł", "l"],
  ["\u{2018}", "'"],
  ["\u{2019}", "'"],
  ["\u{2014}", "-"],
  ["\u{2013}", "-"],
  ["\u{201C}", '"'],
  ["\u{201D}", '"'],
  ["\u{2022}", "-"],
  ["\u{2026}", "..."],
  ["\u{2060}", " "],
  ["\u{2666}", "-"],
  ["\u{8222}", '"'],
  ["„", '"'],
  ["🙂", ":)"],
  ["😭", ":("],
];

function simplifyCharacters(paragraphs: Array<string>): Array<string> {
  const REGEX_MAP = CHARACTER_MAP.map((pair) => {
    return [new RegExp(pair[0], "g"), pair[1]];
  });

  return paragraphs.map((paragraph) => {
    let p = paragraph;
    REGEX_MAP.forEach((pair) => {
      p = p.replace(pair[0], pair[1]);
    });
    return p;
  });
}

// check if a period is terminating a sentence
function isValidPeriod(str: string, loc: number): boolean {
  const length = str.length;
  if (loc + 3 > length) {
    // if its close to the end of the entire string, its not useful
    return false;
  }
  // get the character after the period and the space
  const next_char = str[loc + 2];

  if (LOWERCASE_LETTERS.indexOf(next_char) !== -1) {
    // assume that periods followed by a lowercase letter are not valid
    return false;
  }

  // find the space that precedes the last word before the period
  const prev_space_loc = str.lastIndexOf(" ", loc);
  if (prev_space_loc === -1) {
    // not certain why this would happen, so assume its invalid
    return false;
  }
  // check that the last word isn't an honorific like "Mr." or "Mrs."
  const prev_word = str.slice(prev_space_loc + 1, loc);

  if (HONORIFICS.indexOf(prev_word) !== -1) {
    return false;
  }

  return true;
}

function findSequences(
  haystack: string,
  needle: string,
  isValid: (string, number) => boolean
) {
  const locOffset = needle.search(/\s/);

  const length = haystack.length;
  const locations: Array<BreakingLocation> = [];
  let offset = 0;
  // we are using these locations to break paragraphs, so we aren't concerned
  // with anything in the last 8 characters of the string
  while (offset < length - 8) {
    const loc = haystack.indexOf(needle, offset);
    if (loc !== -1) {
      offset = loc + 1;
      if (isValid(haystack, loc)) {
        locations.push({
          start: loc + locOffset,
          end: loc + needle.length,
          needle,
        });
      }
    } else {
      offset = length;
    }
  }
  return locations;
}

function isAlwaysValid(haystack: string, loc: number): boolean {
  return true;
}

function findAlwaysValidNeedle(
  needle: string,
  haystack: string
): Array<BreakingLocation> {
  return findSequences(haystack, needle, isAlwaysValid);
}

function findPeriods(haystack: string): Array<BreakingLocation> {
  return findSequences(haystack, ". ", isValidPeriod);
}

function findBreakingLocation(
  locationsSet: Array<Array<BreakingLocation>>,
  findCondition: (BreakingLocation) => boolean
) {
  let locations = null;
  for (locations of locationsSet) {
    const result = locations.find(findCondition);
    if (result != null) {
      return result;
    }
  }
  return null;
}

function breakParagraph(rawText: string): Array<string> {
  if (rawText.length < MAXIMUM_STEP) {
    return [rawText];
  } else {
    const breakingLocations: Array<Array<BreakingLocation>> = [];
    breakingLocations.push(findAlwaysValidNeedle("\n\n", rawText));
    breakingLocations.push(findAlwaysValidNeedle("\n", rawText));
    breakingLocations.push(findPeriods(rawText));
    breakingLocations.push(findAlwaysValidNeedle("! ", rawText));
    breakingLocations.push(findAlwaysValidNeedle("? ", rawText));
    breakingLocations.push(findAlwaysValidNeedle("; ", rawText));
    var index = 0;
    const result = [];
    const length = rawText.length;

    while (index < length) {
      const findCondition = (location: BreakingLocation) => {
        return (
          index + MINIMUM_STEP < location.start &&
          location.start < index + MAXIMUM_STEP
        );
      };
      const findCondition2 = (location: BreakingLocation) => {
        return (
          index + MINIMUM_STEP_2 < location.start &&
          location.start < index + MAXIMUM_STEP_2
        );
      };
      const breakingLocation = findBreakingLocation(
        breakingLocations,
        findCondition
      );
      // expand the search a little, just in case we can break there
      const breakingLocation2 = findBreakingLocation(
        breakingLocations,
        findCondition2
      );

      let next_index = 0;
      let suffix = "";
      let slice_length = 0;
      if (length <= index + MAXIMUM_STEP) {
        next_index = length;
        slice_length = length - index;
      } else if (breakingLocation != null) {
        next_index = breakingLocation.end;
        slice_length = breakingLocation.start - index;
      } else if (length <= index + MAXIMUM_STEP_2) {
        next_index = length;
        slice_length = length - index;
      } else if (breakingLocation2 != null) {
        next_index = breakingLocation2.end;
        slice_length = breakingLocation2.start - index;
      } else {
        // preferably this is as rare as possible
        const space_index = rawText.indexOf(" ", index + MAXIMUM_STEP);
        if (space_index === -1) {
          // bail, no idea why this would happen
          next_index = length;
          slice_length = length - index;
        } else {
          next_index = space_index + 1;
          slice_length = space_index - index;
          suffix = "...";
        }
      }
      result.push(rawText.slice(index, index + slice_length).trim() + suffix);
      index = next_index;
    }
    return result;
  }
}

function cleanNewLines(rawText: string): string {
  return rawText
    .replace(MULTI_SPACE_REGEX, " ")
    .replace(CARRIAGE_NEWLINE_REGEX, "\n");
}

function getPreDOMText(el: Node) {
  if (el.nodeType == 3) {
    return el.nodeValue.replace(MULTI_NEWLINE_REGEX, "\n\n");
  } else if (el.childNodes != null && el.childNodes.length > 0) {
    return Array.from(el.childNodes).map(getPreDOMText).join("");
  } else {
    return "";
  }
}

function getDomText(el: Node): string {
  if (el.nodeType == 3) {
    return cleanNewLines(el.nodeValue);
  } else if (el.tagName == "xml") {
    return "";
  } else if (el.nodeName.toLowerCase() == "script") {
    return "";
  } else if (
    el.nodeName.toLowerCase() == "br" ||
    el.nodeName.toLowerCase() == "hr"
  ) {
    return "\n";
  } else if (el.nodeName.toLowerCase() == "pre") {
    return Array.from(el.childNodes).map(getPreDOMText).join("");
  } else if (el.childNodes != null && el.childNodes.length > 0) {
    return Array.from(el.childNodes).map(getDomText).join("");
  } else {
    return "";
  }
}

function getParagraphsWithElements(
  elements: HTMLCollection<HTMLElement>
): Array<string> {
  let result = [];

  for (var i = 0, max = elements.length; i < max; i++) {
    const el = elements[i];
    const rawText = getDomText(el).trim();

    if (rawText.length > 0) {
      result = result.concat(breakParagraph(rawText));
    }
  }
  return simplifyCharacters(result);
}

function getParagraphsWithText(text: string) {
  let largeParagraphs: Array<string> = [""];
  let lines = text.trim().split("\n");

  let isEmpty = false;

  for (let i = 0, max = lines.length; i < max; i++) {
    const line = lines[i].trim();
    if (line.length == 0) {
      if (!isEmpty) {
        isEmpty = true;
        largeParagraphs.push("");
      }
      // ignore multiple empty lines
    } else {
      isEmpty = false;
      const index = largeParagraphs.length - 1;
      if (largeParagraphs[index].length == 0) {
        largeParagraphs[index] = line.trim();
      } else {
        largeParagraphs[index] =
          largeParagraphs[index].trim() + " " + line.trim();
      }
    }
  }
  let result: Array<string> = [];
  // we should now have large paragraphs that can be broken
  for (let i = 0, max = largeParagraphs.length; i < max; i++) {
    result = result.concat(breakParagraph(largeParagraphs[i]));
  }
  return simplifyCharacters(result);
}

module.exports.getParagraphsWithElements = getParagraphsWithElements;
module.exports.getParagraphsWithText = getParagraphsWithText;
