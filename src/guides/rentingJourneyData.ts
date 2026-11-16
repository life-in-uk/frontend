// GENERATED from the Renting Phase 1 journey copy (zh-CN source; zh-TW by OpenCC cn→tw with the
// same corrections as the Guides; en/ur/hi translated from zh-CN). Edit the generator, not this file.
// Practical wording only: rule statements are never restated here. Each step names evidence keys,
// and the page shows those statements from the published Guide in the reader's locale.

export const RENTING_GUIDE_SLUGS = [
  "renting-letting-agent-overview",
  "renting-finding-viewing",
  "renting-referencing-checks",
  "renting-guarantors",
  "renting-deposits-fees",
  "renting-tenancy-agreement"
] as const;

export const RENTING_SCOPES = [
  {
    "id": "england-agent",
    "inScope": true,
    "label": {
      "zh-CN": "在英格兰，通过中介租私人住房",
      "zh-TW": "在英格蘭，通過中介租私人住房",
      "en": "In England, renting a private home through a letting agent",
      "ur": "انگلینڈ میں، لیٹنگ ایجنٹ کے ذریعے نجی گھر",
      "hi": "इंग्लैंड में, लेटिंग एजेंट के ज़रिए निजी घर"
    }
  },
  {
    "id": "england-direct",
    "inScope": false,
    "label": {
      "zh-CN": "在英格兰，直接向房东租",
      "zh-TW": "在英格蘭，直接向房東租",
      "en": "In England, renting directly from a landlord",
      "ur": "انگلینڈ میں، براہِ راست مالک مکان سے",
      "hi": "इंग्लैंड में, सीधे मकान मालिक से"
    }
  },
  {
    "id": "other-housing",
    "inScope": false,
    "label": {
      "zh-CN": "学生宿舍、和房东同住（lodger）、市政府或住房协会住房",
      "zh-TW": "學生宿舍、和房東同住（lodger）、市政府或住房協會住房",
      "en": "Student halls, living with the landlord (lodger), council or housing association",
      "ur": "طلبہ ہاسٹل، مالک مکان کے ساتھ رہنا (lodger)، کونسل یا ہاؤسنگ ایسوسی ایشن",
      "hi": "छात्र हॉस्टल, मकान मालिक के साथ रहना (lodger), काउंसिल या हाउसिंग एसोसिएशन"
    }
  },
  {
    "id": "other-nation",
    "inScope": false,
    "label": {
      "zh-CN": "在苏格兰、威尔士或北爱尔兰",
      "zh-TW": "在蘇格蘭、威爾士或北愛爾蘭",
      "en": "In Scotland, Wales or Northern Ireland",
      "ur": "اسکاٹ لینڈ، ویلز یا شمالی آئرلینڈ میں",
      "hi": "स्कॉटलैंड, वेल्स या उत्तरी आयरलैंड में"
    }
  }
] as const;

export const RENTING_BRANCHES = [
  {
    "id": "student-newcomer",
    "label": {
      "zh-CN": "学生或刚到英国",
      "zh-TW": "學生或剛到英國",
      "en": "Student or newly arrived in the UK",
      "ur": "طالب علم یا حال ہی میں برطانیہ آئے ہیں",
      "hi": "छात्र या हाल ही में ब्रिटेन आए हैं"
    },
    "hint": {
      "zh-CN": "可能还没有英国信用记录或英国担保人。",
      "zh-TW": "可能還沒有英國信用記錄或英國擔保人。",
      "en": "You may not have a UK credit history or a UK guarantor yet.",
      "ur": "ممکن ہے ابھی آپ کی برطانوی کریڈٹ ہسٹری یا برطانوی ضامن نہ ہو۔",
      "hi": "हो सकता है अभी आपका ब्रिटिश क्रेडिट इतिहास या ब्रिटिश गारंटर न हो।"
    },
    "note": {
      "zh-CN": "没有英国信用记录很常见。可以问中介接受哪些证明；担保人只有被要求时才需要，学生也不是一律都要。",
      "zh-TW": "沒有英國信用記錄很常見。可以問中介接受哪些證明；擔保人只有被要求時才需要，學生也不是一律都要。",
      "en": "Having no UK credit history is common. Ask the agent what proof they accept; a guarantor is only needed if you are asked, and not every student has to have one.",
      "ur": "برطانوی کریڈٹ ہسٹری نہ ہونا عام ہے۔ ایجنٹ سے پوچھیں کہ وہ کون سا ثبوت قبول کرتے ہیں؛ ضامن صرف مانگنے پر چاہیے، اور ہر طالب علم کے لیے لازمی نہیں۔",
      "hi": "ब्रिटिश क्रेडिट इतिहास न होना आम है। एजेंट से पूछें कि वे कौन सा प्रमाण मानते हैं; गारंटर सिर्फ़ माँगने पर चाहिए, और हर छात्र के लिए ज़रूरी नहीं।"
    }
  },
  {
    "id": "employed-family",
    "label": {
      "zh-CN": "在职租客或家庭",
      "zh-TW": "在職租客或家庭",
      "en": "Employed tenant or family",
      "ur": "ملازمت پیشہ کرایہ دار یا خاندان",
      "hi": "नौकरीपेशा किरायेदार या परिवार"
    },
    "hint": {
      "zh-CN": "有工作收入，或和家人、孩子一起租房。",
      "zh-TW": "有工作收入，或和家人、孩子一起租房。",
      "en": "You have earnings from work, or are renting with family or children.",
      "ur": "آپ کی ملازمت کی آمدنی ہے، یا آپ خاندان یا بچوں کے ساتھ کرایہ لے رہے ہیں۔",
      "hi": "आपकी नौकरी की आय है, या आप परिवार या बच्चों के साथ किराए पर ले रहे हैं।"
    },
    "note": {
      "zh-CN": "准备好收入证明和推荐人。房东不能因为你有孩子或领福利就拒绝出租。",
      "zh-TW": "準備好收入證明和推薦人。房東不能因為你有孩子或領福利就拒絕出租。",
      "en": "Have proof of income and referees ready. A landlord cannot refuse to rent to you because you have children or receive benefits.",
      "ur": "آمدنی کا ثبوت اور حوالہ دہندگان تیار رکھیں۔ مالک مکان اس وجہ سے انکار نہیں کر سکتا کہ آپ کے بچے ہیں یا آپ بینیفٹس لیتے ہیں۔",
      "hi": "आय का प्रमाण और रेफ़री तैयार रखें। मकान मालिक इस वजह से मना नहीं कर सकता कि आपके बच्चे हैं या आप बेनिफ़िट लेते हैं।"
    }
  },
  {
    "id": "other",
    "label": {
      "zh-CN": "其他情况",
      "zh-TW": "其他情況",
      "en": "Other circumstances",
      "ur": "دیگر صورتیں",
      "hi": "अन्य स्थितियाँ"
    },
    "hint": {
      "zh-CN": "例如自雇、领福利或收入不固定。",
      "zh-TW": "例如自僱、領福利或收入不固定。",
      "en": "For example self-employed, receiving benefits or with irregular income.",
      "ur": "مثلاً خود روزگار، بینیفٹس لینے والے یا غیر مستقل آمدنی۔",
      "hi": "जैसे स्व-रोज़गार, बेनिफ़िट लेने वाले या अनियमित आय।"
    },
    "note": {
      "zh-CN": "流程相同，但证明负担能力的方式可能不同，可以直接问中介需要什么。领福利不能成为拒绝出租的理由。",
      "zh-TW": "流程相同，但證明負擔能力的方式可能不同，可以直接問中介需要什麼。領福利不能成為拒絕出租的理由。",
      "en": "The steps are the same, but how you show you can afford the rent may differ; ask the agent what they need. Receiving benefits cannot be a reason to refuse to rent to you.",
      "ur": "مراحل وہی ہیں، لیکن کرایہ ادا کرنے کی استطاعت دکھانے کا طریقہ مختلف ہو سکتا ہے؛ ایجنٹ سے پوچھیں کہ انہیں کیا چاہیے۔ بینیفٹس لینا کرایہ نہ دینے کی وجہ نہیں ہو سکتا۔",
      "hi": "चरण वही हैं, लेकिन किराया दे पाने की क्षमता दिखाने का तरीक़ा अलग हो सकता है; एजेंट से पूछें कि उन्हें क्या चाहिए। बेनिफ़िट लेना किराए पर न देने का कारण नहीं हो सकता।"
    }
  }
] as const;

export const RENTING_STEPS = [
  {
    "id": "listing",
    "guide": "renting-finding-viewing",
    "title": {
      "zh-CN": "看房源",
      "zh-TW": "看房源",
      "en": "Look at listings",
      "ur": "اشتہارات دیکھیں",
      "hi": "विज्ञापन देखें"
    },
    "action": {
      "zh-CN": "在网站或中介处看房源，确认广告写了具体租金和包含哪些账单。",
      "zh-TW": "在網站或中介處看房源，確認廣告寫了具體租金和包含哪些帳單。",
      "en": "Look at listings online or with agents, and check the advert states a specific rent and what bills it includes.",
      "ur": "آن لائن یا ایجنٹوں کے پاس اشتہارات دیکھیں، اور تصدیق کریں کہ اشتہار میں مخصوص کرایہ اور شامل بل لکھے ہیں۔",
      "hi": "ऑनलाइन या एजेंटों के पास विज्ञापन देखें, और जाँचें कि विज्ञापन में तय किराया और शामिल बिल लिखे हैं।"
    },
    "facts": [
      {
        "guide": "renting-finding-viewing",
        "key": "advert-specific-rent",
        "kind": "legal"
      },
      {
        "guide": "renting-finding-viewing",
        "key": "no-bidding",
        "kind": "legal"
      },
      {
        "guide": "renting-finding-viewing",
        "key": "report-bidding",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "listing-rent-stated",
        "label": {
          "zh-CN": "广告写明了具体租金",
          "zh-TW": "廣告寫明瞭具體租金",
          "en": "The advert states a specific rent",
          "ur": "اشتہار میں مخصوص کرایہ لکھا ہے",
          "hi": "विज्ञापन में तय किराया लिखा है"
        }
      },
      {
        "id": "listing-screenshot",
        "label": {
          "zh-CN": "保存了广告截图",
          "zh-TW": "保存了廣告截圖",
          "en": "I saved a screenshot of the advert",
          "ur": "میں نے اشتہار کا اسکرین شاٹ محفوظ کیا",
          "hi": "मैंने विज्ञापन का स्क्रीनशॉट सहेजा"
        }
      }
    ]
  },
  {
    "id": "contact",
    "guide": "renting-letting-agent-overview",
    "title": {
      "zh-CN": "联系中介",
      "zh-TW": "聯繫中介",
      "en": "Contact the agent",
      "ur": "ایجنٹ سے رابطہ",
      "hi": "एजेंट से संपर्क"
    },
    "action": {
      "zh-CN": "联系中介约看房，并确认这家中介加入了投诉调解机构。从这一步起，尽量用书面方式沟通。",
      "zh-TW": "聯繫中介約看房，並確認這家中介加入了投訴調解機構。從這一步起，儘量用書面方式溝通。",
      "en": "Contact the agent to arrange a viewing and check they belong to a redress scheme. From here on, keep communication in writing where you can.",
      "ur": "گھر دیکھنے کا وقت طے کرنے کے لیے ایجنٹ سے رابطہ کریں اور تصدیق کریں کہ وہ redress scheme کا رکن ہے۔ اب سے جہاں ممکن ہو تحریری رابطہ رکھیں۔",
      "hi": "घर देखने का समय तय करने के लिए एजेंट से संपर्क करें और जाँचें कि वह redress scheme का सदस्य है। अब से जहाँ हो सके लिखित में बात करें।"
    },
    "facts": [
      {
        "guide": "renting-letting-agent-overview",
        "key": "agent-redress",
        "kind": "legal"
      },
      {
        "guide": "renting-letting-agent-overview",
        "key": "landlord-or-agent",
        "kind": "legal"
      },
      {
        "guide": "renting-finding-viewing",
        "key": "check-agent",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "contact-redress",
        "label": {
          "zh-CN": "确认了中介所属的投诉调解机构",
          "zh-TW": "確認了中介所屬的投訴調解機構",
          "en": "I checked which redress scheme the agent belongs to",
          "ur": "میں نے دیکھا کہ ایجنٹ کس redress scheme کا رکن ہے",
          "hi": "मैंने देखा कि एजेंट किस redress scheme का सदस्य है"
        }
      },
      {
        "id": "contact-writing",
        "label": {
          "zh-CN": "重要的沟通都保留了书面记录",
          "zh-TW": "重要的溝通都保留了書面記錄",
          "en": "I keep important messages in writing",
          "ur": "میں اہم پیغامات تحریری طور پر رکھتا/رکھتی ہوں",
          "hi": "मैं ज़रूरी संदेश लिखित में रखता/रखती हूँ"
        }
      }
    ]
  },
  {
    "id": "viewing",
    "guide": "renting-finding-viewing",
    "title": {
      "zh-CN": "看房",
      "zh-TW": "看房",
      "en": "View the property",
      "ur": "گھر دیکھیں",
      "hi": "घर देखें"
    },
    "action": {
      "zh-CN": "尽量亲自看房，最好有人陪同，并记下房屋状况。没看过房，不要付任何钱。",
      "zh-TW": "儘量親自看房，最好有人陪同，並記下房屋狀況。沒看過房，不要付任何錢。",
      "en": "View in person if you can, ideally with someone else, and note the condition. Do not pay anything for a property you have not seen.",
      "ur": "ہو سکے تو خود جا کر دیکھیں، بہتر ہے کسی کو ساتھ لے جائیں، اور حالت نوٹ کریں۔ بغیر دیکھے گھر کے لیے کچھ ادا نہ کریں۔",
      "hi": "हो सके तो ख़ुद जाकर देखें, बेहतर है किसी को साथ ले जाएँ, और हालत नोट करें। बिना देखे घर के लिए कुछ भी न दें।"
    },
    "facts": [
      {
        "guide": "renting-finding-viewing",
        "key": "view-in-person",
        "kind": "help"
      },
      {
        "guide": "renting-finding-viewing",
        "key": "scams",
        "kind": "help"
      },
      {
        "guide": "renting-finding-viewing",
        "key": "benefits-children",
        "kind": "legal",
        "branches": [
          "employed-family",
          "other"
        ]
      }
    ],
    "tasks": [
      {
        "id": "viewing-in-person",
        "label": {
          "zh-CN": "亲自看过房（或有人替我去看过）",
          "zh-TW": "親自看過房（或有人替我去看過）",
          "en": "I viewed in person (or someone viewed it for me)",
          "ur": "میں نے خود دیکھا (یا کسی نے میرے لیے دیکھا)",
          "hi": "मैंने ख़ुद देखा (या किसी ने मेरे लिए देखा)"
        }
      },
      {
        "id": "viewing-questions",
        "label": {
          "zh-CN": "问清了租金包含的账单和入住日期",
          "zh-TW": "問清了租金包含的帳單和入住日期",
          "en": "I asked which bills the rent includes and the move-in date",
          "ur": "میں نے پوچھا کہ کرائے میں کون سے بل شامل ہیں اور منتقلی کی تاریخ",
          "hi": "मैंने पूछा कि किराए में कौन से बिल शामिल हैं और रहने आने की तारीख़"
        }
      }
    ]
  },
  {
    "id": "apply",
    "guide": "renting-deposits-fees",
    "title": {
      "zh-CN": "提出申请",
      "zh-TW": "提出申請",
      "en": "Apply",
      "ur": "درخواست دیں",
      "hi": "आवेदन करें"
    },
    "action": {
      "zh-CN": "决定要租时提出申请。中介可能要求定金（holding deposit）；付之前先读租约草稿，弄清以后还要付哪些钱。",
      "zh-TW": "決定要租時提出申請。中介可能要求定金（holding deposit）；付之前先讀租約草稿，弄清以後還要付哪些錢。",
      "en": "Apply when you have decided. The agent may ask for a holding deposit; before paying it, read the draft agreement and find out what else you will need to pay.",
      "ur": "فیصلہ کرنے کے بعد درخواست دیں۔ ایجنٹ holding deposit مانگ سکتا ہے؛ ادا کرنے سے پہلے معاہدے کا مسودہ پڑھیں اور جانیں کہ اور کیا ادا کرنا ہوگا۔",
      "hi": "फ़ैसला करने के बाद आवेदन करें। एजेंट holding deposit माँग सकता है; देने से पहले अनुबंध का मसौदा पढ़ें और जानें कि और क्या देना होगा।"
    },
    "facts": [
      {
        "guide": "renting-deposits-fees",
        "key": "holding-cap",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "holding-15-days",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "read-before-holding",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "apply-holding-cap",
        "label": {
          "zh-CN": "定金没有超过 1 周租金",
          "zh-TW": "定金沒有超過 1 周租金",
          "en": "The holding deposit is no more than 1 week's rent",
          "ur": "holding deposit 1 ہفتے کے کرائے سے زیادہ نہیں",
          "hi": "holding deposit 1 हफ़्ते के किराए से ज़्यादा नहीं"
        }
      },
      {
        "id": "apply-receipt",
        "label": {
          "zh-CN": "拿到了付款收据或转账记录",
          "zh-TW": "拿到了付款收據或轉賬記錄",
          "en": "I have a receipt or transfer record",
          "ur": "میرے پاس رسید یا ٹرانسفر کا ریکارڈ ہے",
          "hi": "मेरे पास रसीद या ट्रांसफ़र का रिकॉर्ड है"
        }
      }
    ]
  },
  {
    "id": "referencing",
    "guide": "renting-referencing-checks",
    "title": {
      "zh-CN": "审查和 Right to Rent",
      "zh-TW": "審查和 Right to Rent",
      "en": "Referencing and Right to Rent",
      "ur": "جانچ پڑتال اور Right to Rent",
      "hi": "जाँच और Right to Rent"
    },
    "action": {
      "zh-CN": "中介会做两种检查：法律规定的 Right to Rent 检查，以及中介自己的收入、信用和推荐人审查。这两种都不能向你收费。",
      "zh-TW": "中介會做兩種檢查：法律規定的 Right to Rent 檢查，以及中介自己的收入、信用和推薦人審查。這兩種都不能向你收費。",
      "en": "The agent carries out two kinds of check: the legally required Right to Rent check, and its own income, credit and reference checks. You cannot be charged for either.",
      "ur": "ایجنٹ دو قسم کی جانچ کرتا ہے: قانونی طور پر لازمی Right to Rent جانچ، اور اپنی آمدنی، کریڈٹ اور حوالوں کی جانچ۔ کسی کی فیس آپ سے نہیں لی جا سکتی۔",
      "hi": "एजेंट दो तरह की जाँच करता है: क़ानूनी रूप से ज़रूरी Right to Rent जाँच, और अपनी आय, क्रेडिट और रेफ़रेंस जाँच। किसी के लिए भी आपसे फ़ीस नहीं ली जा सकती।"
    },
    "facts": [
      {
        "guide": "renting-referencing-checks",
        "key": "right-to-rent",
        "kind": "legal"
      },
      {
        "guide": "renting-referencing-checks",
        "key": "share-code-or-documents",
        "kind": "legal"
      },
      {
        "guide": "renting-referencing-checks",
        "key": "checks-no-fee",
        "kind": "legal"
      },
      {
        "guide": "renting-referencing-checks",
        "key": "no-minimum-credit",
        "kind": "agent"
      },
      {
        "guide": "renting-referencing-checks",
        "key": "credit-permission",
        "kind": "agent"
      },
      {
        "guide": "renting-referencing-checks",
        "key": "no-uk-history",
        "kind": "help",
        "branches": [
          "student-newcomer"
        ]
      },
      {
        "guide": "renting-referencing-checks",
        "key": "ask-what-proof",
        "kind": "help",
        "branches": [
          "student-newcomer"
        ]
      },
      {
        "guide": "renting-referencing-checks",
        "key": "newcomer-discrimination",
        "kind": "help",
        "branches": [
          "student-newcomer"
        ]
      },
      {
        "guide": "renting-referencing-checks",
        "key": "affordability",
        "kind": "agent",
        "branches": [
          "employed-family",
          "other"
        ]
      }
    ],
    "tasks": [
      {
        "id": "ref-right-to-rent",
        "label": {
          "zh-CN": "准备好证明 Right to Rent 的方式（share code 或有效文件）",
          "zh-TW": "準備好證明 Right to Rent 的方式（share code 或有效文件）",
          "en": "I know how I will prove my Right to Rent (share code or eligible documents)",
          "ur": "مجھے معلوم ہے کہ Right to Rent کیسے ثابت کروں گا/گی (share code یا درست دستاویزات)",
          "hi": "मुझे पता है कि Right to Rent कैसे साबित करूँगा/करूँगी (share code या मान्य दस्तावेज़)"
        }
      },
      {
        "id": "ref-ask-proof",
        "label": {
          "zh-CN": "问过中介接受哪些收入或负担能力证明",
          "zh-TW": "問過中介接受哪些收入或負擔能力證明",
          "en": "I asked the agent what proof of income or affordability they accept",
          "ur": "میں نے ایجنٹ سے پوچھا کہ وہ آمدنی یا استطاعت کا کون سا ثبوت قبول کرتے ہیں",
          "hi": "मैंने एजेंट से पूछा कि वे आय या क्षमता का कौन सा प्रमाण मानते हैं"
        }
      },
      {
        "id": "ref-references",
        "label": {
          "zh-CN": "准备好推荐人（以前的房东、雇主、大学或认识我的人）",
          "zh-TW": "準備好推薦人（以前的房東、僱主、大學或認識我的人）",
          "en": "I have referees ready (a previous landlord, employer, university or someone who knows me)",
          "ur": "میرے حوالہ دہندگان تیار ہیں (پچھلا مالک مکان، آجر، یونیورسٹی یا کوئی جاننے والا)",
          "hi": "मेरे रेफ़री तैयार हैं (पिछला मकान मालिक, नियोक्ता, विश्वविद्यालय या कोई जानने वाला)"
        }
      }
    ]
  },
  {
    "id": "guarantor",
    "guide": "renting-guarantors",
    "title": {
      "zh-CN": "需要时找担保人",
      "zh-TW": "需要時找擔保人",
      "en": "A guarantor, if asked",
      "ur": "ضرورت ہو تو ضامن",
      "hi": "ज़रूरत हो तो गारंटर"
    },
    "action": {
      "zh-CN": "担保人是房东或中介可以提出的条件，不是对每个人的法律要求。只有被要求时才需要准备。",
      "zh-TW": "擔保人是房東或中介可以提出的條件，不是對每個人的法律要求。只有被要求時才需要準備。",
      "en": "A guarantor is a condition the landlord or agent can set, not a legal requirement for everyone. You only need one if you are asked.",
      "ur": "ضامن ایک شرط ہے جو مالک مکان یا ایجنٹ رکھ سکتا ہے، ہر ایک کے لیے قانونی تقاضا نہیں۔ صرف تب چاہیے جب آپ سے مانگا جائے۔",
      "hi": "गारंटर एक शर्त है जो मकान मालिक या एजेंट रख सकता है, हर किसी के लिए क़ानूनी शर्त नहीं। सिर्फ़ तब चाहिए जब आपसे माँगा जाए।"
    },
    "facts": [
      {
        "guide": "renting-guarantors",
        "key": "guarantor-is-condition",
        "kind": "agent"
      },
      {
        "guide": "renting-guarantors",
        "key": "uk-based",
        "kind": "agent",
        "branches": [
          "student-newcomer"
        ]
      },
      {
        "guide": "renting-guarantors",
        "key": "no-forced-service",
        "kind": "optional"
      },
      {
        "guide": "renting-guarantors",
        "key": "council-schemes",
        "kind": "help",
        "branches": [
          "student-newcomer",
          "other"
        ]
      },
      {
        "guide": "renting-guarantors",
        "key": "joint-tenancy",
        "kind": "help"
      },
      {
        "guide": "renting-guarantors",
        "key": "rent-in-advance-cap",
        "kind": "legal"
      }
    ],
    "tasks": [
      {
        "id": "guarantor-asked",
        "label": {
          "zh-CN": "确认了中介是否要求担保人",
          "zh-TW": "確認了中介是否要求擔保人",
          "en": "I checked whether the agent requires a guarantor",
          "ur": "میں نے دیکھا کہ کیا ایجنٹ ضامن مانگتا ہے",
          "hi": "मैंने देखा कि क्या एजेंट गारंटर माँगता है"
        }
      },
      {
        "id": "guarantor-options",
        "label": {
          "zh-CN": "想过没有英国担保人时的其他选择",
          "zh-TW": "想過沒有英國擔保人時的其他選擇",
          "en": "I considered other options if I have no UK guarantor",
          "ur": "برطانوی ضامن نہ ہونے کی صورت میں دوسرے راستوں پر غور کیا",
          "hi": "ब्रिटिश गारंटर न होने पर दूसरे विकल्पों पर विचार किया"
        },
        "branches": [
          "student-newcomer"
        ]
      },
      {
        "id": "guarantor-scope",
        "label": {
          "zh-CN": "担保人读过担保协议和担保范围",
          "zh-TW": "擔保人讀過擔保協議和擔保範圍",
          "en": "My guarantor has read the guarantee and what it covers",
          "ur": "میرے ضامن نے ضمانت نامہ اور اس کا دائرہ پڑھ لیا ہے",
          "hi": "मेरे गारंटर ने गारंटी अनुबंध और उसका दायरा पढ़ लिया है"
        }
      }
    ]
  },
  {
    "id": "agreement",
    "guide": "renting-tenancy-agreement",
    "title": {
      "zh-CN": "看清租约",
      "zh-TW": "看清租約",
      "en": "Check the agreement",
      "ur": "معاہدہ دیکھیں",
      "hi": "अनुबंध जाँचें"
    },
    "action": {
      "zh-CN": "签字前拿到租约或书面信息，逐条核对租金、账单、押金、结束方式和你的权利；看不懂就先问。",
      "zh-TW": "簽字前拿到租約或書面資訊，逐條核對租金、帳單、押金、結束方式和你的權利；看不懂就先問。",
      "en": "Before signing, get the agreement or written information and check the rent, bills, deposit, how it ends and your rights; ask about anything you do not understand.",
      "ur": "دستخط سے پہلے معاہدہ یا تحریری معلومات لیں اور کرایہ، بل، ڈپازٹ، ختم ہونے کا طریقہ اور اپنے حقوق دیکھیں؛ جو سمجھ نہ آئے پوچھیں۔",
      "hi": "हस्ताक्षर से पहले अनुबंध या लिखित जानकारी लें और किराया, बिल, डिपॉज़िट, ख़त्म होने का तरीक़ा और अपने अधिकार जाँचें; जो समझ न आए पूछें।"
    },
    "facts": [
      {
        "guide": "renting-tenancy-agreement",
        "key": "agreement-or-info",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "required-details",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "rights-in-law",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "rent-increase",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "sham",
        "kind": "help"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "legal-words",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "agreement-received",
        "label": {
          "zh-CN": "签字前拿到了租约或书面信息",
          "zh-TW": "簽字前拿到了租約或書面資訊",
          "en": "I received the agreement or written information before signing",
          "ur": "دستخط سے پہلے مجھے معاہدہ یا تحریری معلومات ملیں",
          "hi": "हस्ताक्षर से पहले मुझे अनुबंध या लिखित जानकारी मिली"
        }
      },
      {
        "id": "agreement-matches",
        "label": {
          "zh-CN": "租金和账单与广告一致",
          "zh-TW": "租金和帳單與廣告一致",
          "en": "The rent and bills match the advert",
          "ur": "کرایہ اور بل اشتہار سے میل کھاتے ہیں",
          "hi": "किराया और बिल विज्ञापन से मेल खाते हैं"
        }
      },
      {
        "id": "agreement-questions",
        "label": {
          "zh-CN": "看不懂的条款已经问清楚",
          "zh-TW": "看不懂的條款已經問清楚",
          "en": "I asked about any terms I did not understand",
          "ur": "جو شرائط سمجھ نہیں آئیں وہ پوچھ لیں",
          "hi": "जो शर्तें समझ नहीं आईं वे पूछ लीं"
        }
      }
    ]
  },
  {
    "id": "payments",
    "guide": "renting-deposits-fees",
    "title": {
      "zh-CN": "只付允许收的钱",
      "zh-TW": "只付允許收的錢",
      "en": "Pay only permitted amounts",
      "ur": "صرف جائز رقوم ادا کریں",
      "hi": "सिर्फ़ अनुमत रक़में दें"
    },
    "action": {
      "zh-CN": "核对要付的每一笔钱是否在允许清单上：押金、签约后的预付租金等。担保公司、保险等服务可以不用，不能被强制购买。",
      "zh-TW": "核對要付的每一筆錢是否在允許清單上：押金、簽約後的預付租金等。擔保公司、保險等服務可以不用，不能被強制購買。",
      "en": "Check every payment is on the permitted list: the deposit, rent in advance after signing and so on. Services such as guarantor companies or insurance are optional and cannot be forced on you.",
      "ur": "ہر ادائیگی جائز فہرست میں ہے یا نہیں دیکھیں: ڈپازٹ، دستخط کے بعد پیشگی کرایہ وغیرہ۔ ضامن کمپنی یا انشورنس جیسی خدمات اختیاری ہیں اور آپ پر زبردستی نہیں ڈالی جا سکتیں۔",
      "hi": "हर भुगतान अनुमत सूची में है या नहीं जाँचें: डिपॉज़िट, हस्ताक्षर के बाद अग्रिम किराया आदि। गारंटर कंपनी या बीमा जैसी सेवाएँ वैकल्पिक हैं और आप पर थोपी नहीं जा सकतीं।"
    },
    "facts": [
      {
        "guide": "renting-deposits-fees",
        "key": "permitted-list",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "rent-in-advance",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "deposit-cap",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "optional-products",
        "kind": "optional"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "refuse-prohibited",
        "kind": "help"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "council-prohibited",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "payments-permitted",
        "label": {
          "zh-CN": "每一笔要付的钱都在允许清单上",
          "zh-TW": "每一筆要付的錢都在允許清單上",
          "en": "Every payment requested is on the permitted list",
          "ur": "مانگی گئی ہر ادائیگی جائز فہرست میں ہے",
          "hi": "माँगा गया हर भुगतान अनुमत सूची में है"
        }
      },
      {
        "id": "payments-no-rent-before",
        "label": {
          "zh-CN": "没有在签约前付租金",
          "zh-TW": "沒有在簽約前付租金",
          "en": "I did not pay rent before signing",
          "ur": "میں نے دستخط سے پہلے کرایہ ادا نہیں کیا",
          "hi": "मैंने हस्ताक्षर से पहले किराया नहीं दिया"
        }
      },
      {
        "id": "payments-records",
        "label": {
          "zh-CN": "保留了所有付款记录",
          "zh-TW": "保留了所有付款記錄",
          "en": "I kept records of every payment",
          "ur": "میں نے ہر ادائیگی کا ریکارڈ رکھا",
          "hi": "मैंने हर भुगतान का रिकॉर्ड रखा"
        }
      }
    ]
  },
  {
    "id": "sign",
    "guide": "renting-tenancy-agreement",
    "title": {
      "zh-CN": "签约",
      "zh-TW": "簽約",
      "en": "Sign",
      "ur": "دستخط کریں",
      "hi": "हस्ताक्षर करें"
    },
    "action": {
      "zh-CN": "确认无误后再签。新租约是滚动租约，你可以提前通知退租；签了以后想反悔会比较难。",
      "zh-TW": "確認無誤後再簽。新租約是滾動租約，你可以提前通知退租；簽了以後想反悔會比較難。",
      "en": "Sign only when you are satisfied. A new tenancy is a rolling tenancy that you can end with notice; changing your mind after signing is hard.",
      "ur": "مطمئن ہونے پر ہی دستخط کریں۔ نئی کرایہ داری رولنگ ہوتی ہے جسے آپ نوٹس دے کر ختم کر سکتے ہیں؛ دستخط کے بعد ارادہ بدلنا مشکل ہے۔",
      "hi": "संतुष्ट होने पर ही हस्ताक्षर करें। नई किरायेदारी रोलिंग होती है जिसे आप नोटिस देकर ख़त्म कर सकते हैं; हस्ताक्षर के बाद इरादा बदलना मुश्किल है।"
    },
    "facts": [
      {
        "guide": "renting-tenancy-agreement",
        "key": "rolling-tenancy",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "tenant-notice",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "cancel",
        "kind": "help"
      }
    ],
    "tasks": [
      {
        "id": "sign-copy",
        "label": {
          "zh-CN": "保存了签好的租约副本",
          "zh-TW": "保存了簽好的租約副本",
          "en": "I kept a copy of the signed agreement",
          "ur": "میں نے دستخط شدہ معاہدے کی کاپی رکھی",
          "hi": "मैंने हस्ताक्षरित अनुबंध की कॉपी रखी"
        }
      }
    ]
  },
  {
    "id": "keys",
    "guide": "renting-deposits-fees",
    "title": {
      "zh-CN": "拿钥匙",
      "zh-TW": "拿鑰匙",
      "en": "Collect the keys",
      "ur": "چابیاں لیں",
      "hi": "चाबियाँ लें"
    },
    "action": {
      "zh-CN": "约好拿钥匙的时间。押金须在 30 天内受到保护，你应收到保护计划的信息；入住前还应拿到燃气安全证书和能源性能证书。",
      "zh-TW": "約好拿鑰匙的時間。押金須在 30 天內受到保護，你應收到保護計劃的資訊；入住前還應拿到燃氣安全證書和能源性能證書。",
      "en": "Arrange when to collect the keys. Your deposit must be protected within 30 days and you should receive the scheme information; before moving in you should also get the gas safety certificate and energy performance certificate.",
      "ur": "چابیاں لینے کا وقت طے کریں۔ آپ کا ڈپازٹ 30 دن میں محفوظ ہونا لازمی ہے اور آپ کو اسکیم کی معلومات ملنی چاہئیں؛ منتقل ہونے سے پہلے گیس سیفٹی سرٹیفکیٹ اور انرجی پرفارمنس سرٹیفکیٹ بھی ملنے چاہئیں۔",
      "hi": "चाबियाँ लेने का समय तय करें। आपका डिपॉज़िट 30 दिनों में सुरक्षित होना ज़रूरी है और आपको स्कीम की जानकारी मिलनी चाहिए; रहने आने से पहले गैस सुरक्षा प्रमाणपत्र और एनर्जी परफ़ॉर्मेंस सर्टिफ़िकेट भी मिलने चाहिए।"
    },
    "facts": [
      {
        "guide": "renting-deposits-fees",
        "key": "deposit-protection",
        "kind": "legal"
      },
      {
        "guide": "renting-deposits-fees",
        "key": "prescribed-info",
        "kind": "legal"
      },
      {
        "guide": "renting-tenancy-agreement",
        "key": "other-documents",
        "kind": "legal"
      }
    ],
    "tasks": [
      {
        "id": "keys-deposit-protected",
        "label": {
          "zh-CN": "确认押金已受保护，并收到了保护计划的信息",
          "zh-TW": "確認押金已受保護，並收到了保護計劃的資訊",
          "en": "My deposit is protected and I received the scheme information",
          "ur": "میرا ڈپازٹ محفوظ ہے اور مجھے اسکیم کی معلومات مل گئیں",
          "hi": "मेरा डिपॉज़िट सुरक्षित है और मुझे स्कीम की जानकारी मिल गई"
        }
      },
      {
        "id": "keys-certificates",
        "label": {
          "zh-CN": "拿到了燃气安全证书和能源性能证书（EPC）",
          "zh-TW": "拿到了燃氣安全證書和能源性能證書（EPC）",
          "en": "I received the gas safety certificate and EPC",
          "ur": "مجھے گیس سیفٹی سرٹیفکیٹ اور EPC مل گئے",
          "hi": "मुझे गैस सुरक्षा प्रमाणपत्र और EPC मिल गए"
        }
      },
      {
        "id": "keys-date",
        "label": {
          "zh-CN": "约好了拿钥匙的时间",
          "zh-TW": "約好了拿鑰匙的時間",
          "en": "I arranged when to collect the keys",
          "ur": "میں نے چابیاں لینے کا وقت طے کر لیا",
          "hi": "मैंने चाबियाँ लेने का समय तय कर लिया"
        }
      }
    ]
  }
] as const;

export const RENTING_LATER_STEPS = [
  {
    "id": "moving-in-inventory",
    "title": {
      "zh-CN": "入住、库存清单和房屋状况",
      "zh-TW": "入住、庫存清單和房屋狀況",
      "en": "Moving in, inventory and property condition",
      "ur": "منتقلی، انوینٹری اور گھر کی حالت",
      "hi": "रहने आना, इन्वेंटरी और घर की हालत"
    }
  },
  {
    "id": "council-tax",
    "title": {
      "zh-CN": "Council Tax",
      "zh-TW": "Council Tax",
      "en": "Council Tax",
      "ur": "Council Tax",
      "hi": "Council Tax"
    }
  },
  {
    "id": "energy",
    "title": {
      "zh-CN": "电和燃气",
      "zh-TW": "電和燃氣",
      "en": "Electricity and gas",
      "ur": "بجلی اور گیس",
      "hi": "बिजली और गैस"
    }
  },
  {
    "id": "water",
    "title": {
      "zh-CN": "水费和污水费",
      "zh-TW": "水費和汙水費",
      "en": "Water and sewerage",
      "ur": "پانی اور سیوریج",
      "hi": "पानी और सीवरेज"
    }
  },
  {
    "id": "broadband",
    "title": {
      "zh-CN": "宽带和网络",
      "zh-TW": "寬帶和網路",
      "en": "Broadband and internet",
      "ur": "براڈ بینڈ اور انٹرنیٹ",
      "hi": "ब्रॉडबैंड और इंटरनेट"
    }
  },
  {
    "id": "tv-licence",
    "title": {
      "zh-CN": "电视许可证（TV Licence）",
      "zh-TW": "電視許可證（TV Licence）",
      "en": "TV Licence",
      "ur": "TV Licence",
      "hi": "TV Licence"
    }
  }
] as const;

export const RENTING_FACT_KINDS = {
  "legal": {
    "zh-CN": "法律要求",
    "zh-TW": "法律要求",
    "en": "Legal requirement",
    "ur": "قانونی تقاضا",
    "hi": "क़ानूनी शर्त"
  },
  "agent": {
    "zh-CN": "中介和房东的做法",
    "zh-TW": "中介和房東的做法",
    "en": "Agent and landlord practice",
    "ur": "ایجنٹ اور مالک مکان کا طریقہ",
    "hi": "एजेंट और मकान मालिक का तरीक़ा"
  },
  "optional": {
    "zh-CN": "可选服务",
    "zh-TW": "可選服務",
    "en": "Optional service",
    "ur": "اختیاری سروس",
    "hi": "वैकल्पिक सेवा"
  },
  "help": {
    "zh-CN": "注意或需要帮助",
    "zh-TW": "注意或需要幫助",
    "en": "Watch out or get help",
    "ur": "احتیاط یا مدد",
    "hi": "सावधानी या मदद"
  }
} as const;

export const RENTING_COPY = {
  "eyebrow": {
    "zh-CN": "租房与入住 · 英格兰",
    "zh-TW": "租房與入住 · 英格蘭",
    "en": "Renting and moving in · England",
    "ur": "کرایہ داری اور منتقلی · انگلینڈ",
    "hi": "किराए पर घर और रहने आना · इंग्लैंड"
  },
  "title": {
    "zh-CN": "在英格兰通过中介租房",
    "zh-TW": "在英格蘭通過中介租房",
    "en": "Renting through a letting agent in England",
    "ur": "انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے کرایہ داری",
    "hi": "इंग्लैंड में लेटिंग एजेंट के ज़रिए किराए पर घर"
  },
  "lead": {
    "zh-CN": "从看房源到拿钥匙，一步一步：每一步做什么、哪些是法律要求、哪些是中介的做法、哪些服务可以不用，以及遇到问题找谁。",
    "zh-TW": "從看房源到拿鑰匙，一步一步：每一步做什麼、哪些是法律要求、哪些是中介的做法、哪些服務可以不用，以及遇到問題找誰。",
    "en": "From listings to keys, step by step: what to do at each stage, what the law requires, what is the agent's own practice, which services are optional, and where to get help.",
    "ur": "اشتہارات سے چابیوں تک، مرحلہ وار: ہر مرحلے پر کیا کریں، قانون کیا تقاضا کرتا ہے، ایجنٹ کا اپنا طریقہ کیا ہے، کون سی خدمات اختیاری ہیں، اور مدد کہاں سے لیں۔",
    "hi": "विज्ञापनों से चाबियों तक, चरण-दर-चरण: हर चरण में क्या करें, क़ानून क्या माँगता है, एजेंट का अपना तरीक़ा क्या है, कौन सी सेवाएँ वैकल्पिक हैं, और मदद कहाँ से लें।"
  },
  "noticeTitle": {
    "zh-CN": "适用范围",
    "zh-TW": "適用範圍",
    "en": "What this covers",
    "ur": "دائرہ کار",
    "hi": "दायरा"
  },
  "notice": {
    "zh-CN": "只适用于在英格兰通过中介租私人住房的租客；规则核对到 2026 年 11 月 15 日。这是一般信息，不是法律意见。",
    "zh-TW": "只適用於在英格蘭通過中介租私人住房的租客；規則核對到 2026 年 11 月 15 日。這是一般資訊，不是法律意見。",
    "en": "Only for tenants renting a private home in England through a letting agent; rules checked as at 15 November 2026. General information, not legal advice.",
    "ur": "صرف ان کرایہ داروں کے لیے جو انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے نجی گھر کرائے پر لیتے ہیں؛ قواعد 15 نومبر 2026 تک جانچے گئے۔ عمومی معلومات، قانونی مشورہ نہیں۔",
    "hi": "सिर्फ़ उन किरायेदारों के लिए जो इंग्लैंड में लेटिंग एजेंट के ज़रिए निजी घर किराए पर लेते हैं; नियम 15 नवंबर 2026 तक जाँचे गए। सामान्य जानकारी, क़ानूनी सलाह नहीं।"
  },
  "help": {
    "zh-CN": "遇到问题可以联系当地市政府（council），或免费咨询 Shelter 和 Citizens Advice。",
    "zh-TW": "遇到問題可以聯繫當地市政府（council），或免費諮詢 Shelter 和 Citizens Advice。",
    "en": "If something goes wrong, contact your local council, or get free advice from Shelter or Citizens Advice.",
    "ur": "اگر کچھ غلط ہو تو اپنی مقامی کونسل سے رابطہ کریں، یا Shelter یا Citizens Advice سے مفت مشورہ لیں۔",
    "hi": "अगर कुछ ग़लत हो तो अपनी स्थानीय काउंसिल से संपर्क करें, या Shelter या Citizens Advice से मुफ़्त सलाह लें।"
  },
  "journeyTitle": {
    "zh-CN": "租房步骤和清单",
    "zh-TW": "租房步驟和清單",
    "en": "Renting steps and checklist",
    "ur": "کرایہ داری کے مراحل اور چیک لسٹ",
    "hi": "किराए के चरण और चेकलिस्ट"
  },
  "journeyLead": {
    "zh-CN": "回答两个问题，看到适合你的步骤。勾选只保存在这个页面里，关闭后不会保留；这里不会要求你输入任何个人信息或上传文件。",
    "zh-TW": "回答兩個問題，看到適合你的步驟。勾選只保存在這個頁面裡，關閉後不會保留；這裡不會要求你輸入任何個人資訊或上傳文件。",
    "en": "Answer two questions to see the steps that fit you. Ticks stay on this page only and are not kept after you close it; you are never asked to enter personal details or upload documents.",
    "ur": "دو سوالوں کے جواب دیں اور اپنے مطابق مراحل دیکھیں۔ نشانات صرف اسی صفحے پر رہتے ہیں اور بند کرنے کے بعد محفوظ نہیں رہتے؛ آپ سے کوئی ذاتی معلومات یا دستاویز نہیں مانگی جاتی۔",
    "hi": "दो सवालों के जवाब दें और अपने लिए सही चरण देखें। निशान सिर्फ़ इसी पेज पर रहते हैं और बंद करने के बाद नहीं रहते; आपसे कोई निजी जानकारी या दस्तावेज़ नहीं माँगा जाता।"
  },
  "scopeQuestion": {
    "zh-CN": "你在哪里、怎样租房？",
    "zh-TW": "你在哪裡、怎樣租房？",
    "en": "Where and how are you renting?",
    "ur": "آپ کہاں اور کیسے کرایہ لے رہے ہیں؟",
    "hi": "आप कहाँ और कैसे किराए पर ले रहे हैं?"
  },
  "branchQuestion": {
    "zh-CN": "哪种情况最接近你？",
    "zh-TW": "哪種情況最接近你？",
    "en": "Which is closest to you?",
    "ur": "کون سی صورت آپ کے سب سے قریب ہے؟",
    "hi": "कौन सी स्थिति आपके सबसे क़रीब है?"
  },
  "outOfScopeTitle": {
    "zh-CN": "这部分内容不适用于你的情况",
    "zh-TW": "這部分內容不適用於你的情況",
    "en": "This section does not cover your situation",
    "ur": "یہ حصہ آپ کی صورت پر لاگو نہیں ہوتا",
    "hi": "यह हिस्सा आपकी स्थिति पर लागू नहीं होता"
  },
  "outOfScope": {
    "zh-CN": "这里的步骤只针对在英格兰通过中介租私人住房。你的情况适用不同的规则，下面的步骤可能不准确。可以先读总览了解基本概念，并向 Citizens Advice 或 Shelter 咨询适用于你的规则。",
    "zh-TW": "這裡的步驟只針對在英格蘭通過中介租私人住房。你的情況適用不同的規則，下面的步驟可能不準確。可以先讀總覽瞭解基本概念，並向 Citizens Advice 或 Shelter 諮詢適用於你的規則。",
    "en": "These steps only cover renting a private home in England through a letting agent. Different rules apply to your situation, so the steps here may not be accurate. You can read the overview for the basic ideas, and ask Citizens Advice or Shelter about the rules that apply to you.",
    "ur": "یہ مراحل صرف انگلینڈ میں لیٹنگ ایجنٹ کے ذریعے نجی گھر کرائے پر لینے کے لیے ہیں۔ آپ کی صورت پر مختلف قواعد لاگو ہوتے ہیں، اس لیے یہاں کے مراحل درست نہیں ہو سکتے۔ بنیادی باتوں کے لیے جائزہ پڑھ سکتے ہیں، اور اپنے قواعد کے بارے میں Citizens Advice یا Shelter سے پوچھ سکتے ہیں۔",
    "hi": "ये चरण सिर्फ़ इंग्लैंड में लेटिंग एजेंट के ज़रिए निजी घर किराए पर लेने के लिए हैं। आपकी स्थिति पर अलग नियम लागू होते हैं, इसलिए यहाँ के चरण सही नहीं हो सकते। बुनियादी बातों के लिए अवलोकन पढ़ सकते हैं, और अपने नियमों के बारे में Citizens Advice या Shelter से पूछ सकते हैं।"
  },
  "readOverview": {
    "zh-CN": "阅读总览",
    "zh-TW": "閱讀總覽",
    "en": "Read the overview",
    "ur": "جائزہ پڑھیں",
    "hi": "अवलोकन पढ़ें"
  },
  "change": {
    "zh-CN": "修改回答",
    "zh-TW": "修改回答",
    "en": "Change answers",
    "ur": "جوابات بدلیں",
    "hi": "जवाब बदलें"
  },
  "progress": {
    "zh-CN": "已完成 {done} / {total} 项",
    "zh-TW": "已完成 {done} / {total} 項",
    "en": "{done} of {total} done",
    "ur": "{total} میں سے {done} مکمل",
    "hi": "{total} में से {done} पूरे"
  },
  "step": {
    "zh-CN": "第 {n} 步",
    "zh-TW": "第 {n} 步",
    "en": "Step {n}",
    "ur": "مرحلہ {n}",
    "hi": "चरण {n}"
  },
  "readGuide": {
    "zh-CN": "阅读指南",
    "zh-TW": "閱讀指南",
    "en": "Read the guide",
    "ur": "رہنمائی پڑھیں",
    "hi": "मार्गदर्शिका पढ़ें"
  },
  "factsLabel": {
    "zh-CN": "指南里的要点",
    "zh-TW": "指南里的要點",
    "en": "Key points from the guide",
    "ur": "رہنمائی کے اہم نکات",
    "hi": "मार्गदर्शिका की मुख्य बातें"
  },
  "factsLoading": {
    "zh-CN": "正在加载要点…",
    "zh-TW": "正在加載要點…",
    "en": "Loading key points…",
    "ur": "اہم نکات لوڈ ہو رہے ہیں…",
    "hi": "मुख्य बातें लोड हो रही हैं…"
  },
  "factsUnavailable": {
    "zh-CN": "要点暂时无法显示，请阅读指南。",
    "zh-TW": "要點暫時無法顯示，請閱讀指南。",
    "en": "Key points cannot be shown right now; please read the guide.",
    "ur": "اہم نکات اس وقت نہیں دکھائے جا سکتے؛ براہِ کرم رہنمائی پڑھیں۔",
    "hi": "मुख्य बातें अभी नहीं दिखाई जा सकतीं; कृपया मार्गदर्शिका पढ़ें।"
  },
  "tasksLabel": {
    "zh-CN": "清单",
    "zh-TW": "清單",
    "en": "Checklist",
    "ur": "چیک لسٹ",
    "hi": "चेकलिस्ट"
  },
  "notPublished": {
    "zh-CN": "这篇指南暂时还没有发布。",
    "zh-TW": "這篇指南暫時還沒有發佈。",
    "en": "This guide is not published yet.",
    "ur": "یہ رہنمائی ابھی شائع نہیں ہوئی۔",
    "hi": "यह मार्गदर्शिका अभी प्रकाशित नहीं हुई है।"
  },
  "laterTitle": {
    "zh-CN": "拿到钥匙以后（准备中）",
    "zh-TW": "拿到鑰匙以後（準備中）",
    "en": "After you get the keys (in preparation)",
    "ur": "چابیاں ملنے کے بعد (تیاری میں)",
    "hi": "चाबियाँ मिलने के बाद (तैयारी में)"
  },
  "laterLead": {
    "zh-CN": "入住以后的这些内容正在准备，发布后会接在上面的步骤后面。",
    "zh-TW": "入住以後的這些內容正在準備，發佈後會接在上面的步驟後面。",
    "en": "These move-in topics are being prepared and will continue the steps above once published.",
    "ur": "منتقلی کے بعد کے یہ موضوعات تیاری میں ہیں اور شائع ہونے پر اوپر کے مراحل کے بعد آئیں گے۔",
    "hi": "रहने आने के बाद के ये विषय तैयार हो रहे हैं और प्रकाशित होने पर ऊपर के चरणों के बाद आएँगे।"
  },
  "guidesTitle": {
    "zh-CN": "全部租房指南",
    "zh-TW": "全部租房指南",
    "en": "All renting guides",
    "ur": "کرایہ داری کی تمام رہنمائیاں",
    "hi": "किराए की सभी मार्गदर्शिकाएँ"
  },
  "guidesLead": {
    "zh-CN": "按租房顺序排列。",
    "zh-TW": "按租房順序排列。",
    "en": "In the order you will need them.",
    "ur": "اس ترتیب میں جس میں آپ کو ان کی ضرورت ہوگی۔",
    "hi": "उसी क्रम में जिसमें आपको इनकी ज़रूरत होगी।"
  },
  "loading": {
    "zh-CN": "正在加载指南…",
    "zh-TW": "正在加載指南…",
    "en": "Loading guides…",
    "ur": "رہنمائیاں لوڈ ہو رہی ہیں…",
    "hi": "मार्गदर्शिकाएँ लोड हो रही हैं…"
  },
  "unavailable": {
    "zh-CN": "指南暂时无法加载，请稍后再试。",
    "zh-TW": "指南暫時無法加載，請稍後再試。",
    "en": "Guides cannot be loaded right now. Please try again later.",
    "ur": "رہنمائیاں اس وقت لوڈ نہیں ہو سکتیں۔ براہِ کرم بعد میں کوشش کریں۔",
    "hi": "मार्गदर्शिकाएँ अभी लोड नहीं हो सकतीं। कृपया बाद में प्रयास करें।"
  },
  "updated": {
    "zh-CN": "更新于",
    "zh-TW": "更新於",
    "en": "Updated",
    "ur": "تازہ کاری",
    "hi": "अपडेट"
  }
} as const;
