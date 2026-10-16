// English question variants for Ask the Exhibit (EN mode). BGE-small-zh is a Chinese model; EN queries
// are matched against these hand-written English variants (embedding + English keywords), not translated.
// Calibration: docs/calib/en/ (separate from the Chinese n=101 set).
export const QA_EN: Record<string, { q: string[]; kw: string[] }> = {
  "q-chatgpt": { q: ["Is this a ChatGPT wrapper?", "Does it use an online large language model?", "Is there an LLM or API behind the guide?"], kw: ["chatgpt", "gpt", "llm", "large language model", "wrapper", "openai", "api"] },
  "q-photo": { q: ["Can you generate a photo of Tengwang Pavilion or a meiping vase?", "Can it create an image for me?", "Make me a picture of the vase"], kw: ["generate", "photo", "image", "picture", "draw"] },
  "q-real-vase": { q: ["Is the vase in the cabinet a real museum object?", "Is this meiping an actual museum piece?", "Is the vase a scan of a real artifact?"], kw: ["real", "museum object", "museum piece", "artifact", "original", "scan"] },
  "q-why-small": { q: ["Why use a small model instead of a large online model?", "Why not connect to a big AI model?", "Why is the model so small?"], kw: ["small model", "big model", "large model", "why small"] },
  "q-song-fencai": { q: ["Why can't a Song meiping be famille rose?", "Why is Song with famille rose a conflict?", "Can Song dynasty porcelain have fencai enamel?"], kw: ["famille rose", "fencai", "soft enamel"] },
  "q-yingqing-name": { q: ["Why is yingqing called shadow blue?", "What does yingqing mean?", "What is qingbai porcelain?"], kw: ["yingqing", "qingbai", "shadow blue"] },
  "q-qinghua-cobalt": { q: ["Where does the blue in blue-and-white come from?", "What makes blue and white porcelain blue?", "What pigment is used for qinghua?"], kw: ["cobalt", "blue-and-white", "blue and white", "qinghua", "pigment"] },
  "q-jihong-hard": { q: ["Why is sacrificial red so hard to make?", "Why is copper red glaze difficult?", "What is jihong?"], kw: ["sacrificial red", "jihong", "copper red", "red glaze"] },
  "q-meiping-use": { q: ["What was the meiping originally used for?", "What is a meiping vase for?", "Was the meiping a wine vessel?"], kw: ["meiping", "plum vase", "wine vessel"] },
  "q-luoxia": { q: ["When is the line about sunset clouds and the lone duck set?", "What time of day is 'sunset clouds fly with the lone duck'?", "What season is the Preface set in?"], kw: ["sunset clouds", "lone duck", "luoxia", "ninth month"] },
  "q-pengli": { q: ["Where is Pengli?", "What is Pengli in the Preface?", "Is Pengli Poyang Lake?"], kw: ["pengli", "poyang"] },
  "q-tengwang-who": { q: ["Who was Prince Teng and why was the pavilion built?", "Who built Tengwang Pavilion?", "When was Tengwang Pavilion built?"], kw: ["prince teng", "li yuanying", "who built", "tengwang pavilion"] },
  "q-yanzhen": { q: ["Why do the geese's cries break off at Hengyang?", "What does Hengyang mean in the Preface?", "Why do geese stop at Hengyang?"], kw: ["hengyang", "geese", "wild geese"] },
  "q-tulou": { q: ["Are weiwu and tulou the same thing?", "What is the difference between Hakka walled houses and Fujian tulou?", "Is a weiwu a tulou?"], kw: ["tulou", "weiwu", "walled house", "fujian"] },
  "q-zutang": { q: ["Why is the ancestral hall on the central axis?", "Where is the ancestral hall in a walled house?", "What is the zutang?"], kw: ["ancestral hall", "zutang", "central axis", "shrine"] },
  "q-jiaolou": { q: ["What are the corner towers for?", "What is the purpose of the corner towers?", "Why do walled houses have gun towers?"], kw: ["corner tower", "gun tower", "jiaolou", "watchtower"] },
  "q-walk": { q: ["How do hours and rooms constrain each other?", "Why can't the threshing yard be shown at night?", "How does the hour-room matrix work?"], kw: ["hour", "room", "threshing yard", "time of day"] },
};
