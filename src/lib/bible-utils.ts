/**
 * Utility for mapping common Bible book names to YouVersion (Bible.com) abbreviations.
 */

const BOOK_MAP: Record<string, string> = {
  "genesis": "GEN",
  "exodus": "EXO",
  "leviticus": "LEV",
  "numbers": "NUM",
  "deuteronomy": "DEU",
  "joshua": "JOS",
  "judges": "JDG",
  "ruth": "RUT",
  "1 samuel": "1SA",
  "2 samuel": "2SA",
  "1 kings": "1KI",
  "2 kings": "2KI",
  "1 chronicles": "1CH",
  "2 chronicles": "2CH",
  "ezra": "EZR",
  "nehemiah": "NEH",
  "esther": "EST",
  "job": "JOB",
  "psalms": "PSA",
  "psalm": "PSA",
  "proverbs": "PRO",
  "ecclesiastes": "ECC",
  "song of solomon": "SNG",
  "isaiah": "ISA",
  "jeremiah": "JER",
  "lamentations": "LAM",
  "ezekiel": "EZK",
  "daniel": "DAN",
  "hosea": "HOS",
  "joel": "JOE",
  "amos": "AMO",
  "obadiah": "OBA",
  "jonah": "JON",
  "micah": "MIC",
  "nahum": "NAM",
  "habakkuk": "HAB",
  "zephaniah": "ZEP",
  "haggai": "HAG",
  "zechariah": "ZEC",
  "malachi": "MAL",
  "matthew": "MAT",
  "mark": "MRK",
  "luke": "LUK",
  "john": "JHN",
  "acts": "ACT",
  "romans": "ROM",
  "1 corinthians": "1CO",
  "2 corinthians": "2CO",
  "galatians": "GAL",
  "ephesians": "EPH",
  "philippians": "PHP",
  "colossians": "COL",
  "1 thessalonians": "1TH",
  "2 thessalonians": "2TH",
  "1 timothy": "1TI",
  "2 timothy": "2TI",
  "titus": "TIT",
  "philemon": "PHM",
  "hebrews": "HEB",
  "james": "JAS",
  "1 peter": "1PE",
  "2 peter": "2PE",
  "1 john": "1JN",
  "2 john": "2JN",
  "3 john": "3JN",
  "jude": "JUD",
  "revelation": "REV"
};

export function getYouVersionUrl(input: string, versionId: string = "111"): string {
  if (!input) return `https://www.bible.com/bible/${versionId}/JHN.1.NIV`;

  const cleanInput = input.toLowerCase().trim();
  
  // Basic regex to find "Book Name" and "Chapter/Verse Number"
  // Try to find the last number in the string as the chapter
  const match = cleanInput.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  
  if (match) {
    const bookName = match[1];
    const chapter = match[2];
    const abbr = BOOK_MAP[bookName] || bookName.substring(0, 3).toUpperCase();
    return `https://www.bible.com/bible/${versionId}/${abbr}.${chapter}.NIV`;
  }

  // Fallback for single word inputs or non-standard
  const abbr = BOOK_MAP[cleanInput] || cleanInput.substring(0, 3).toUpperCase();
  return `https://www.bible.com/bible/${versionId}/${abbr}.1.NIV`;
}
