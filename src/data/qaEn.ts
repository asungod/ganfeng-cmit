// English question variants for Ask the Exhibit (EN mode). BGE-small-zh is a Chinese model; EN queries
// are matched against these hand-written English variants (embedding + English keywords), not translated.
// Calibration: docs/calib/en/ (separate from the Chinese n=101 set).
// v11: expanded variants aimed at EN holdout paraphrases (still developer-written; not visitor logs).
export const QA_EN: Record<string, { q: string[]; kw: string[] }> = {
  "q-chatgpt": {
    q: [
      "Is this a ChatGPT wrapper?",
      "Does it use an online large language model?",
      "Is there an LLM or API behind the guide?",
      "Is the guide powered by an online AI chatbot?",
      "Are you just ChatGPT behind the scenes?",
    ],
    kw: ["chatgpt", "gpt", "llm", "large language model", "wrapper", "openai", "api", "chatbot", "online ai"],
  },
  "q-photo": {
    q: [
      "Can you generate a photo of Tengwang Pavilion or a meiping vase?",
      "Can it create an image for me?",
      "Make me a picture of the vase",
      "Please create a picture of a porcelain vase",
      "Could you draw the pavilion for me?",
    ],
    kw: ["generate", "photo", "image", "picture", "draw", "create a picture"],
  },
  "q-real-vase": {
    q: [
      "Is the vase in the cabinet a real museum object?",
      "Is this meiping an actual museum piece?",
      "Is the vase a scan of a real artifact?",
      "Is the porcelain on display authentic?",
      "Is that vase an actual piece from a museum collection?",
    ],
    kw: ["real", "museum object", "museum piece", "artifact", "original", "scan", "authentic", "on display"],
  },
  "q-why-small": {
    q: [
      "Why use a small model instead of a large online model?",
      "Why not connect to a big AI model?",
      "Why is the model so small?",
      "What is the reason for choosing a tiny model?",
      "Why didn't you use a bigger AI model?",
    ],
    kw: ["small model", "big model", "large model", "why small", "tiny model", "bigger"],
  },
  "q-song-fencai": {
    q: [
      "Why can't a Song vase use famille rose?",
      "Why is Song with famille rose a conflict?",
      "Can Song dynasty porcelain have fencai enamel?",
      "Is famille rose possible on Song dynasty porcelain?",
      "Why is famille rose wrong for a Song vase?",
    ],
    kw: ["famille rose", "fencai", "soft enamel", "song"],
  },
  "q-yingqing-name": {
    q: [
      "Why is yingqing called shadow blue?",
      "What does yingqing mean?",
      "What is qingbai porcelain?",
      "Why is qingbai also called yingqing?",
      "What is the other name for qingbai glaze?",
    ],
    kw: ["yingqing", "qingbai", "shadow blue"],
  },
  "q-qinghua-cobalt": {
    q: [
      "Where does the blue in blue-and-white come from?",
      "What makes blue and white porcelain blue?",
      "What pigment is used for qinghua?",
      "Which mineral gives qinghua its blue?",
      "What ore colors blue-and-white porcelain?",
    ],
    kw: ["cobalt", "blue-and-white", "blue and white", "qinghua", "pigment", "mineral", "ore"],
  },
  "q-jihong-hard": {
    q: [
      "Why is sacrificial red so hard to make?",
      "Why is copper red glaze difficult?",
      "What is jihong?",
      "What makes sacrificial red rare?",
      "Why is copper-red glaze hard to fire?",
    ],
    kw: ["sacrificial red", "jihong", "copper red", "red glaze", "rare"],
  },
  "q-meiping-use": {
    q: [
      "What was the meiping originally used for?",
      "What is a meiping vase for?",
      "Was the meiping a wine vessel?",
      "Was the meiping used for holding wine?",
      "What did people put in a meiping?",
    ],
    kw: ["meiping", "plum vase", "wine vessel", "holding wine"],
  },
  "q-luoxia": {
    q: [
      "When is the line about sunset clouds and the lone duck set?",
      "What time of day is 'sunset clouds fly with the lone duck'?",
      "What season is the Preface set in?",
      "Is the sunset clouds line set in the evening?",
      "Does the luoxia line describe dusk?",
    ],
    kw: ["sunset clouds", "lone duck", "luoxia", "ninth month", "evening", "dusk"],
  },
  "q-pengli": {
    q: [
      "Where is Pengli?",
      "What is Pengli in the Preface?",
      "Is Pengli Poyang Lake?",
      "Does Pengli refer to Poyang Lake?",
      "What place does Pengli name?",
    ],
    kw: ["pengli", "poyang"],
  },
  "q-tengwang-who": {
    q: [
      "Who was Prince Teng and why was the pavilion built?",
      "Who built Tengwang Pavilion?",
      "When was Tengwang Pavilion built?",
      "Why was Tengwang Pavilion constructed?",
      "Who was Tengwang?",
    ],
    kw: ["prince teng", "li yuanying", "who built", "tengwang pavilion", "constructed"],
  },
  "q-yanzhen": {
    q: [
      "Why do the geese's cries break off at Hengyang?",
      "What does Hengyang mean in the Preface?",
      "Why do geese stop at Hengyang?",
      "What is the meaning of the geese line about Hengyang?",
      "Why does the goose formation's sound end at Hengyang?",
    ],
    kw: ["hengyang", "geese", "wild geese", "goose"],
  },
  "q-tulou": {
    q: [
      "Are weiwu and tulou the same thing?",
      "What is the difference between Hakka walled houses and Fujian tulou?",
      "Is a weiwu a tulou?",
      "How are southern Jiangxi walled houses different from tulou?",
      "Do Gannan weiwu equal Fujian tulou?",
    ],
    kw: ["tulou", "weiwu", "walled house", "fujian", "gannan", "southern jiangxi"],
  },
  "q-zutang": {
    q: [
      "Why is the ancestral hall on the central axis?",
      "Where is the ancestral hall in a walled house?",
      "What is the zutang?",
      "What role does the ancestral hall play in the walled house?",
      "Why put the shrine on the central axis?",
    ],
    kw: ["ancestral hall", "zutang", "central axis", "shrine"],
  },
  "q-jiaolou": {
    q: [
      "What are the corner towers for?",
      "What is the purpose of the corner towers?",
      "Why do walled houses have gun towers?",
      "Why are there towers at the corners of the walled house?",
      "What is a jiaolou used for?",
    ],
    kw: ["corner tower", "gun tower", "jiaolou", "watchtower", "towers at the corners"],
  },
  "q-walk": {
    q: [
      "How do hours and rooms constrain each other?",
      "Why can't the threshing yard be shown at night?",
      "How does the hour-room matrix work?",
      "How are the hours matched to rooms?",
      "How does the time-of-day and room matrix work?",
    ],
    kw: ["hour", "room", "threshing yard", "time of day", "matched to rooms", "matrix"],
  },
};
