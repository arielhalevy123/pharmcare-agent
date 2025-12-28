/**
 * Safety module for detecting medical advice requests and managing safety redirects
 */

export const SAFETY_REDIRECT_REASON = 'This question requires medical advice. Please consult with a healthcare professional.';

/**
 * Checks if a message contains medical advice requests
 * Detects patterns in both English and Hebrew
 */
export function isMedicalAdvice(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // English patterns for medical advice detection
  const englishPatterns = [
    // Personal suitability questions
    /should i take|should i use|can i take|can i use/i,
    /should\s+i\s+(take|use|try|start|stop|avoid)/i,
    /can\s+i\s+(take|use|try|start|stop|avoid)/i,
    /is it safe for me|is it okay for me|is it good for me/i,
    /is this safe for me|is this okay for me|is this good for me/i,
    /would it be safe|would it be okay|would it be good/i,
    /is it appropriate for me|is it suitable for me/i,
    /should i buy|should i purchase|should i get/i,
    /can i buy|can i purchase|can i get/i,
    
    // Symptom descriptions
    /i have (pain|fever|headache|symptoms?|condition|disease|illness)/i,
    /i'm feeling|i am feeling|i feel/i,
    /i'm experiencing|i am experiencing/i,
    /i have been (feeling|experiencing|having)/i,
    /my (symptoms?|condition|pain|fever|headache)/i,
    /i'm (sick|ill|unwell|nauseous|dizzy|tired)/i,
    /i am (sick|ill|unwell|nauseous|dizzy|tired)/i,
    
    // Treatment requests
    /what should i do for|how should i treat|how do i treat/i,
    /what can i do for|how can i treat/i,
    /what would you recommend for|what do you recommend for/i,
    /what medicine should i|what medication should i/i,
    /which medicine should i|which medication should i/i,
    /what should i do about|what can i do about/i,
    /how to treat|how to cure|how to heal/i,
    /best treatment for|best medicine for|best medication for/i,
    /should i see a doctor|should i go to|should i visit/i,
    
    // Diagnosis requests
    /diagnos|diagnosis|what do i have|what's wrong with me/i,
    /what condition|what disease|what illness/i,
    /do i have|do you think i have/i,
    /could i have|could this be/i,
    
    // Side effects and interactions
    /side effect|adverse reaction|negative effect/i,
    /drug interaction|medication interaction|interaction with/i,
    /will it interact|does it interact/i,
    /what are the side effects|what side effects/i,
    /is it dangerous|is it harmful/i,
    /will it cause|can it cause/i,
    /what happens if i/i,
    
    // Dosage questions for personal use
    /dosage for me|dose for me|how much should i/i,
    /how many should i take|how many can i take/i,
    /how often should i|how frequently should i/i,
    /when should i take|when can i take/i,
    /can i take more|should i take more|can i increase/i,
    /is this dosage correct|is this dose correct/i,
    /too much|too little|enough/i,
    
    // Personal health questions
    /is it right for me|is it correct for me/i,
    /will it work for me|will it help me/i,
    /should i continue|should i stop/i,
    /can i combine|can i mix|can i take together/i,
    /should i avoid|should i not take/i,
    /is it compatible with|is it safe to combine/i,
  ];
  
  // Hebrew patterns for medical advice detection
  const hebrewPatterns = [
    // Personal suitability questions (Hebrew)
    /אני צריך|אני צריכה|אני יכול|אני יכולה|אני צריך לקחת|אני צריכה לקחת/i,
    /אפשר לי|מותר לי|בטוח לי|בסדר לי|טוב לי/i,
    /כדאי לי|צריך לי|מומלץ לי/i,
    /אני צריך לקנות|אני צריכה לקנות|אני יכול לקנות|אני יכולה לקנות/i,
    /בטוח בשבילי|בסדר בשבילי|טוב בשבילי|מתאים לי/i,
    
    // Symptom descriptions (Hebrew)
    /יש לי (כאב|חום|כאב ראש|תסמינים?|מצב|מחלה)/i,
    /אני מרגיש|אני מרגישה|אני חווה|אני חווה/i,
    /אני מרגיש (חולה|לא טוב|חלש|מסחרחר|עייף)/i,
    /אני מרגישה (חולה|לא טובה|חלשה|מסחרחרת|עייפה)/i,
    /התסמינים שלי|המצב שלי|הכאב שלי/i,
    /אני חולה|אני לא מרגיש טוב|אני לא מרגישה טובה/i,
    
    // Treatment requests (Hebrew)
    /מה אני צריך לעשות|מה אני צריכה לעשות|מה לעשות|איך לטפל/i,
    /מה כדאי לי|מה מומלץ לי|מה אמור להיות/i,
    /איזו תרופה|איזה תרופה|מה התרופה/i,
    /מה צריך לקחת|מה צריך להשתמש/i,
    /איך מטפלים|איך לטפל|איך לרפא/i,
    /הטיפול הטוב ביותר|התרופה הטובה ביותר/i,
    /למי לפנות|למי ללכת|מתי לראות רופא/i,
    
    // Diagnosis requests (Hebrew)
    /מה יש לי|מה המצב שלי|מה המחלה שלי/i,
    /איזה מצב|איזו מחלה|איזו בעיה/i,
    /האם יש לי|אולי יש לי|יכול להיות שיש לי/i,
    /מה הבעיה שלי|מה לא בסדר/i,
    
    // Side effects and interactions (Hebrew)
    /תופעות לוואי|תגובה שלילית|אינטראקציה/i,
    /אינטראקציה עם|אינטראקציה בין/i,
    /האם זה מסוכן|האם זה מזיק|האם זה בטוח/i,
    /מה התופעות|איזה תופעות/i,
    /מה יקרה אם|מה יהיה אם/i,
    
    // Dosage questions (Hebrew)
    /מה המינון בשבילי|מה הכמות בשבילי|כמה לקחת/i,
    /כמה כדורים|כמה טבליות|כמה פעמים/i,
    /מתי לקחת|מתי להשתמש/i,
    /האם המינון נכון|האם הכמות נכונה/i,
    /יותר מדי|פחות מדי|מספיק/i,
    /אפשר לקחת יותר|צריך לקחת יותר/i,
    
    // Personal health questions (Hebrew)
    /זה נכון בשבילי|זה מתאים לי|זה יעזור לי/i,
    /אני צריך להמשיך|אני צריך להפסיק/i,
    /אפשר לשלב|אפשר לערבב|אפשר לקחת יחד/i,
    /צריך להימנע|אסור לי|לא צריך לקחת/i,
    /זה תואם|זה בטוח לשלב|זה בטוח יחד/i,
  ];
  
  // Check English patterns
  for (const pattern of englishPatterns) {
    if (pattern.test(lowerMessage)) {
      return true;
    }
  }
  
  // Check Hebrew patterns (note: Hebrew doesn't need toLowerCase, but we keep it for consistency)
  for (const pattern of hebrewPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  return false;
}

