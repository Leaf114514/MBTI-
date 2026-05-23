/**
 * MBTI Compatibility Scores
 *
 * 136 unique type pairs (16 same-type + 120 different-type).
 * Key format: types sorted alphabetically, e.g. "ENFP-INTJ".
 * Each pair has three integer scores (40-98):
 *   friendship – general social / platonic compatibility
 *   romance    – romantic / relationship compatibility
 *   work       – professional / teamwork compatibility
 *
 * Guiding principles (general MBTI compatibility theory):
 *   - N types pair better with N types; S types pair better with S types
 *   - Complementary cognitive functions score higher
 *   - Same-type pairs: moderate-high (75-88)
 *   - NF-NF pairs: high romance
 *   - NT-NT pairs: high work
 *   - SJ-SP pairs: solid friendship
 *   - Highly "opposite" pairs: lower romance
 */

module.exports = {
  scores: {

    // ============================================================
    //  SAME-TYPE PAIRS (16)
    // ============================================================

    'ENFJ-ENFJ': { friendship: 82, romance: 78, work: 75 },
    'ENFP-ENFP': { friendship: 85, romance: 80, work: 72 },
    'ENTJ-ENTJ': { friendship: 76, romance: 72, work: 88 },
    'ENTP-ENTP': { friendship: 84, romance: 76, work: 80 },
    'ESFJ-ESFJ': { friendship: 80, romance: 77, work: 78 },
    'ESFP-ESFP': { friendship: 86, romance: 75, work: 65 },
    'ESTJ-ESTJ': { friendship: 74, romance: 68, work: 86 },
    'ESTP-ESTP': { friendship: 82, romance: 70, work: 68 },
    'INFJ-INFJ': { friendship: 85, romance: 82, work: 76 },
    'INFP-INFP': { friendship: 88, romance: 84, work: 70 },
    'INTJ-INTJ': { friendship: 78, romance: 75, work: 88 },
    'INTP-INTP': { friendship: 82, romance: 76, work: 84 },
    'ISFJ-ISFJ': { friendship: 82, romance: 78, work: 80 },
    'ISFP-ISFP': { friendship: 86, romance: 80, work: 68 },
    'ISTJ-ISTJ': { friendship: 76, romance: 72, work: 86 },
    'ISTP-ISTP': { friendship: 80, romance: 72, work: 78 },

    // ============================================================
    //  NF - NF PAIRS (6 different-type)
    // ============================================================

    'ENFJ-ENFP': { friendship: 90, romance: 91, work: 78 },
    'ENFJ-INFJ': { friendship: 92, romance: 94, work: 82 },
    'ENFJ-INFP': { friendship: 88, romance: 90, work: 74 },
    'ENFP-INFJ': { friendship: 95, romance: 96, work: 80 },
    'ENFP-INFP': { friendship: 90, romance: 88, work: 72 },
    'INFJ-INFP': { friendship: 93, romance: 95, work: 76 },

    // ============================================================
    //  NT - NT PAIRS (6 different-type)
    // ============================================================

    'ENTJ-ENTP': { friendship: 85, romance: 82, work: 90 },
    'ENTJ-INTJ': { friendship: 82, romance: 80, work: 94 },
    'ENTJ-INTP': { friendship: 80, romance: 76, work: 88 },
    'ENTP-INTJ': { friendship: 88, romance: 84, work: 90 },
    'ENTP-INTP': { friendship: 90, romance: 82, work: 86 },
    'INTJ-INTP': { friendship: 86, romance: 78, work: 90 },

    // ============================================================
    //  NF - NT PAIRS (16)
    // ============================================================

    'ENFJ-ENTJ': { friendship: 78, romance: 82, work: 86 },
    'ENFJ-ENTP': { friendship: 84, romance: 88, work: 80 },
    'ENFJ-INTJ': { friendship: 82, romance: 86, work: 84 },
    'ENFJ-INTP': { friendship: 80, romance: 84, work: 78 },
    'ENFP-ENTJ': { friendship: 82, romance: 86, work: 84 },
    'ENFP-ENTP': { friendship: 90, romance: 92, work: 82 },
    'ENFP-INTJ': { friendship: 85, romance: 92, work: 78 },
    'ENFP-INTP': { friendship: 88, romance: 90, work: 80 },
    'ENTJ-INFJ': { friendship: 80, romance: 84, work: 88 },
    'ENTJ-INFP': { friendship: 76, romance: 80, work: 82 },
    'ENTP-INFJ': { friendship: 88, romance: 90, work: 82 },
    'ENTP-INFP': { friendship: 90, romance: 88, work: 78 },
    'INFJ-INTJ': { friendship: 84, romance: 88, work: 86 },
    'INFJ-INTP': { friendship: 86, romance: 86, work: 82 },
    'INFP-INTJ': { friendship: 78, romance: 82, work: 76 },
    'INFP-INTP': { friendship: 84, romance: 80, work: 78 },

    // ============================================================
    //  SJ - SJ PAIRS (6 different-type)
    // ============================================================

    'ESFJ-ISFJ': { friendship: 88, romance: 84, work: 86 },
    'ESFJ-ISTJ': { friendship: 80, romance: 76, work: 88 },
    'ESTJ-ISFJ': { friendship: 76, romance: 74, work: 86 },
    'ESTJ-ISTJ': { friendship: 82, romance: 76, work: 92 },
    'ISFJ-ISTJ': { friendship: 84, romance: 82, work: 88 },
    'ESTJ-ESFJ': { friendship: 80, romance: 76, work: 88 },

    // ============================================================
    //  SP - SP PAIRS (6 different-type)
    // ============================================================

    'ESFP-ESTP': { friendship: 88, romance: 80, work: 72 },
    'ESFP-ISFP': { friendship: 90, romance: 82, work: 68 },
    'ESFP-ISTP': { friendship: 84, romance: 78, work: 74 },
    'ESTP-ISFP': { friendship: 82, romance: 76, work: 72 },
    'ESTP-ISTP': { friendship: 86, romance: 78, work: 80 },
    'ISFP-ISTP': { friendship: 88, romance: 82, work: 74 },

    // ============================================================
    //  SJ - SP PAIRS (16)
    // ============================================================

    'ESFJ-ESFP': { friendship: 84, romance: 78, work: 72 },
    'ESFJ-ESTP': { friendship: 78, romance: 74, work: 76 },
    'ESFJ-ISFP': { friendship: 82, romance: 76, work: 70 },
    'ESFJ-ISTP': { friendship: 74, romance: 68, work: 74 },
    'ESTJ-ESFP': { friendship: 72, romance: 66, work: 74 },
    'ESTJ-ESTP': { friendship: 78, romance: 72, work: 82 },
    'ESTJ-ISFP': { friendship: 68, romance: 62, work: 66 },
    'ESTJ-ISTP': { friendship: 76, romance: 70, work: 84 },
    'ESFP-ISFJ': { friendship: 82, romance: 76, work: 68 },
    'ESFP-ISTJ': { friendship: 70, romance: 64, work: 66 },
    'ESTP-ISFJ': { friendship: 76, romance: 70, work: 72 },
    'ESTP-ISTJ': { friendship: 74, romance: 66, work: 76 },
    'ISFJ-ISFP': { friendship: 86, romance: 82, work: 74 },
    'ISFJ-ISTP': { friendship: 80, romance: 76, work: 78 },
    'ISTJ-ISFP': { friendship: 70, romance: 64, work: 68 },
    'ISTJ-ISTP': { friendship: 78, romance: 72, work: 84 },

    // ============================================================
    //  NF - SJ PAIRS (16)
    // ============================================================

    'ENFJ-ESFJ': { friendship: 82, romance: 80, work: 82 },
    'ENFJ-ISFJ': { friendship: 84, romance: 82, work: 80 },
    'ENFJ-ESTJ': { friendship: 70, romance: 68, work: 76 },
    'ENFJ-ISTJ': { friendship: 68, romance: 64, work: 72 },
    'ENFP-ESFJ': { friendship: 78, romance: 76, work: 72 },
    'ENFP-ISFJ': { friendship: 80, romance: 78, work: 70 },
    'ENFP-ESTJ': { friendship: 66, romance: 62, work: 68 },
    'ENFP-ISTJ': { friendship: 64, romance: 58, work: 64 },
    'ESFJ-INFJ': { friendship: 82, romance: 80, work: 80 },
    'ESFJ-INFP': { friendship: 78, romance: 76, work: 72 },
    'ESTJ-INFJ': { friendship: 66, romance: 62, work: 74 },
    'ESTJ-INFP': { friendship: 60, romance: 56, work: 64 },
    'INFJ-ISFJ': { friendship: 84, romance: 82, work: 78 },
    'INFJ-ISTJ': { friendship: 68, romance: 64, work: 72 },
    'INFP-ISFJ': { friendship: 80, romance: 78, work: 70 },
    'INFP-ISTJ': { friendship: 62, romance: 56, work: 62 },

    // ============================================================
    //  NF - SP PAIRS (16)
    // ============================================================

    'ENFJ-ESFP': { friendship: 80, romance: 78, work: 70 },
    'ENFJ-ESTP': { friendship: 76, romance: 74, work: 74 },
    'ENFJ-ISFP': { friendship: 84, romance: 82, work: 72 },
    'ENFJ-ISTP': { friendship: 72, romance: 68, work: 72 },
    'ENFP-ESFP': { friendship: 84, romance: 78, work: 66 },
    'ENFP-ESTP': { friendship: 80, romance: 76, work: 70 },
    'ENFP-ISFP': { friendship: 88, romance: 84, work: 68 },
    'ENFP-ISTP': { friendship: 78, romance: 72, work: 70 },
    'ESFP-INFJ': { friendship: 78, romance: 76, work: 68 },
    'ESFP-INFP': { friendship: 82, romance: 78, work: 64 },
    'ESTP-INFJ': { friendship: 74, romance: 72, work: 72 },
    'ESTP-INFP': { friendship: 76, romance: 72, work: 66 },
    'INFJ-ISFP': { friendship: 86, romance: 84, work: 70 },
    'INFJ-ISTP': { friendship: 74, romance: 72, work: 74 },
    'INFP-ISFP': { friendship: 88, romance: 84, work: 66 },
    'INFP-ISTP': { friendship: 76, romance: 70, work: 68 },

    // ============================================================
    //  NT - SJ PAIRS (16)
    // ============================================================

    'ENTJ-ESFJ': { friendship: 68, romance: 64, work: 78 },
    'ENTJ-ISFJ': { friendship: 70, romance: 66, work: 76 },
    'ENTJ-ESTJ': { friendship: 76, romance: 72, work: 90 },
    'ENTJ-ISTJ': { friendship: 78, romance: 74, work: 92 },
    'ENTP-ESFJ': { friendship: 70, romance: 66, work: 70 },
    'ENTP-ISFJ': { friendship: 72, romance: 68, work: 68 },
    'ENTP-ESTJ': { friendship: 68, romance: 64, work: 78 },
    'ENTP-ISTJ': { friendship: 70, romance: 64, work: 74 },
    'ESFJ-INTJ': { friendship: 66, romance: 62, work: 76 },
    'ESFJ-INTP': { friendship: 68, romance: 64, work: 70 },
    'ESTJ-INTJ': { friendship: 78, romance: 74, work: 92 },
    'ESTJ-INTP': { friendship: 70, romance: 64, work: 80 },
    'INTJ-ISFJ': { friendship: 68, romance: 64, work: 78 },
    'INTJ-ISTJ': { friendship: 76, romance: 72, work: 90 },
    'INTP-ISFJ': { friendship: 70, romance: 66, work: 72 },
    'INTP-ISTJ': { friendship: 72, romance: 66, work: 76 },

    // ============================================================
    //  NT - SP PAIRS (16)
    // ============================================================

    'ENTJ-ESFP': { friendship: 62, romance: 56, work: 68 },
    'ENTJ-ESTP': { friendship: 72, romance: 68, work: 80 },
    'ENTJ-ISFP': { friendship: 60, romance: 54, work: 64 },
    'ENTJ-ISTP': { friendship: 70, romance: 66, work: 82 },
    'ENTP-ESFP': { friendship: 78, romance: 72, work: 68 },
    'ENTP-ESTP': { friendship: 82, romance: 76, work: 76 },
    'ENTP-ISFP': { friendship: 74, romance: 68, work: 64 },
    'ENTP-ISTP': { friendship: 84, romance: 78, work: 78 },
    'ESFP-INTJ': { friendship: 58, romance: 50, work: 62 },
    'ESFP-INTP': { friendship: 72, romance: 66, work: 64 },
    'ESTP-INTJ': { friendship: 66, romance: 60, work: 76 },
    'ESTP-INTP': { friendship: 80, romance: 74, work: 76 },
    'INTJ-ISFP': { friendship: 62, romance: 56, work: 66 },
    'INTJ-ISTP': { friendship: 72, romance: 68, work: 82 },
    'INTP-ISFP': { friendship: 72, romance: 66, work: 64 },
    'INTP-ISTP': { friendship: 82, romance: 76, work: 80 }
  }
};
