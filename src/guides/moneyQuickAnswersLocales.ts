// Money Quick Answers in the translated locales. Same answers, same cited
// evidence keys as the reviewed Simplified Chinese set (moneyQuickAnswers.ts);
// only the wording is translated. Each fingerprint was computed with
// evidenceFingerprint() over that locale's published translation of the Guide,
// so an answer is withheld if the localized evidence later changes.
// Generated from the reviewed translations; edit the wording with care.

import type { GuideLocale } from "./locales.ts";
import { MONEY_QUICK_ANSWERS } from "./moneyQuickAnswers.ts";
import type { QuickAnswerSet } from "./moneyQuickAnswers.ts";

type Wording = { question: string; answer: string; nextStep?: string };

const WORDING: Record<Exclude<GuideLocale, "zh-CN">, Record<string, Wording>> = {
  "zh-TW": {
    "no-address-proof": {
      "question": "還沒有英國地址證明，能開戶嗎？",
      "answer": "不一定開不了。大多數銀行會要求或可能要求地址證明，但接受哪些文件、在哪個渠道接受，各家不同；截至 2026 年 10 月 7 日，有銀行列出大學的錄取確認信或 HMRC 通知信等替代文件。",
      "nextStep": "先查你要申請的那家銀行、那個帳戶的清單，網上和網點分開看，再找它寫明的替代文件。"
    },
    "law-vs-bank": {
      "question": "法律規定開戶必須交地址證明嗎？",
      "answer": "反洗錢法規要求銀行識別並核實你的身份，但沒有給所有銀行定一張統一的開戶文件清單；要不要地址證明、收哪些文件，由各家銀行按自己的風險流程決定。實際上，大多數銀行會要求或可能要求地址證明。",
      "nextStep": "所以要看你申請的那家銀行、那個帳戶現在接受什麼。"
    },
    "identity-documents": {
      "question": "身份方面要準備什麼？",
      "answer": "先確認中國護照在有效期內，並準備好 eVisa 等英國移民身份證明。截至 2026 年 10 月 7 日，有銀行寫明非英國 / 非歐盟護照要配合有效簽證或 eVisa share code。",
      "nextStep": "需要時在 UKVI 帳戶生成 share code，有效期 90 天，過期可以再生成。"
    },
    "evisa-no-brp": {
      "question": "只有 eVisa、沒有 BRP，能開戶嗎？",
      "answer": "不要因此以為開不了。英國政府說明 eVisa 已經取代了實體移民文件，只是截至 2026 年 10 月 7 日，有些銀行的文件清單裡仍寫著 BRP。",
      "nextStep": "先看這家銀行現在怎麼寫，必要時直接問銀行。"
    },
    "student-account": {
      "question": "剛到的留學生能開學生帳戶嗎？",
      "answer": "不一定。截至 2026 年 10 月 7 日，有幾家銀行的學生帳戶要求在英國住滿大約三年，可能不適合剛落地的你；這些銀行也提示，不符合的可以看他們的其他帳戶。",
      "nextStep": "查看這家銀行其他帳戶的資格條件，或比較其他銀行的帳戶。"
    },
    "school-letter": {
      "question": "一定要學校開的 bank letter 嗎？",
      "answer": "法規沒有給銀行規定統一的文件清單，也沒有要求留學生必須交學校的信；有沒有用、用在哪一步，看具體銀行。截至 2026 年 10 月 7 日，有銀行把大學的錄取確認信或 university banking letter 列為可用材料。",
      "nextStep": "先問學校能開哪些證明信，再對照你要申請的那家銀行的清單。"
    },
    "employer-letter-tenancy": {
      "question": "僱主的信、租房合同能當地址證明嗎？",
      "answer": "不是所有銀行都收。截至 2026 年 10 月 7 日，有銀行在網點接受“已知僱主”出具的確認住址和在職的信；租房合同的接受範圍差別很大，私人房東直接籤的合同在我們查看的多數銀行清單裡沒有看到明確接受。"
    },
    "ni-number-letter": {
      "question": "國民保險號的通知信有用嗎？要等多久？",
      "answer": "可能有用，但要等。住在英國、有工作權、正在工作 / 找工作 / 有工作 offer 的人可以申請，可能要最多 4 周，有些人的號碼已顯示在 eVisa 裡；截至 2026 年 10 月 7 日，有銀行把 HMRC 通知信列為新來的人可用的文件。"
    },
    "rejected": {
      "question": "第一家銀行拒絕了，怎麼辦？",
      "answer": "一家拒絕不代表其他家也會拒絕：每家銀行按自己的風險流程決定要哪些文件。截至 2026 年 10 月 7 日，有的銀行寫明，沒有清單上的身份文件或固定英國地址時，可以去網點談。",
      "nextStep": "先問清原因，再試換渠道、換帳戶、換銀行，必要時瞭解基本帳戶。"
    },
    "basic-account": {
      "question": "基本帳戶（Basic Bank Account）是什麼？誰能開？",
      "answer": "一種功能簡單的英鎊帳戶，標準操作免費，沒有透支。政府指定的一些銀行要向符合條件的人提供，條件大致是合法居住在英國，並且沒有其他具備基本功能的英國帳戶，或不符合這家銀行其他所有帳戶的條件。",
      "nextStep": "它不是人人都能開；申請前看清這家銀行的條件。"
    },
    "fscs": {
      "question": "錢存在銀行，有 FSCS 保障嗎？",
      "answer": "英國授權的銀行、住房互助會或信用合作社倒閉時，FSCS 一般對每位符合條件的存款人、每家授權機構賠付最多 £120,000，適用於 2025 年 11 月 30 日之後倒閉的機構。共用一張銀行牌照的品牌按同一家算。"
    },
    "app-bank-protection": {
      "question": "用 app 開的帳戶，錢也受保障嗎？",
      "answer": "用不用 app 不決定保障，要看機構類型：英國授權的銀行倒閉時，存款一般受 FSCS 保障（有上限）；電子貨幣機構和支付機構裡的錢不受 FSCS 存款保障。",
      "nextStep": "用 FSCS 的保障查詢工具，或在 FCA 金融服務登記冊上查這家機構是否獲得授權、和誰共用牌照。"
    }
  },
  "en": {
    "no-address-proof": {
      "question": "I don't have UK proof of address yet. Can I still open an account?",
      "answer": "Not necessarily a no. Most banks ask for, or may ask for, proof of address, but which documents they accept, and through which route, differs between banks; as at 7 October 2026, some banks listed alternatives such as a university acceptance letter or an HMRC letter.",
      "nextStep": "First check the list for the bank and account you are applying for, looking at online and branch separately, then look for the alternative documents it lists."
    },
    "law-vs-bank": {
      "question": "Does the law say you must provide proof of address to open an account?",
      "answer": "Anti-money laundering regulations require banks to identify you and verify your identity, but they don't set one standard list of documents for all banks; whether proof of address is needed, and which documents are accepted, is decided by each bank under its own risk processes. In practice, most banks ask for, or may ask for, proof of address.",
      "nextStep": "So it depends on what the bank and account you are applying for accepts now."
    },
    "identity-documents": {
      "question": "What do I need for identity?",
      "answer": "First make sure your Chinese passport is in date, and have proof of your UK immigration status ready, such as your eVisa. As at 7 October 2026, one bank stated that non-UK / non-EU passports must be supported by a valid visa or an eVisa share code.",
      "nextStep": "When needed, generate a share code in your UKVI account; it lasts 90 days and you can generate a new one when it expires."
    },
    "evisa-no-brp": {
      "question": "I only have an eVisa and no BRP. Can I open an account?",
      "answer": "Don't assume you can't. The UK government says eVisas have replaced physical immigration documents; it is just that, as at 7 October 2026, some banks' document lists still mentioned the BRP.",
      "nextStep": "First check what this bank says now, and ask the bank directly if needed."
    },
    "student-account": {
      "question": "Can a newly arrived international student open a student account?",
      "answer": "Not necessarily. As at 7 October 2026, several banks' student accounts required about three years' residence in the UK, so they may not suit you if you have just arrived; these banks also point people who don't qualify to their other accounts.",
      "nextStep": "Check the eligibility conditions for the bank's other accounts, or compare accounts at other banks."
    },
    "school-letter": {
      "question": "Do I have to have a bank letter from my university?",
      "answer": "The regulations don't set one standard document list for banks, and don't require international students to provide a university letter; whether it helps, and at which step, depends on the bank. As at 7 October 2026, some banks listed a university acceptance letter or a university banking letter as usable documents.",
      "nextStep": "First ask your university which letters it can provide, then check them against the list of the bank you are applying to."
    },
    "employer-letter-tenancy": {
      "question": "Can an employer's letter or a tenancy agreement be used as proof of address?",
      "answer": "Not every bank accepts them. As at 7 October 2026, one bank accepted, in branch, a letter from a \"known employer\" confirming your address and employment; what counts as an acceptable tenancy agreement varies a lot, and tenancy agreements signed directly with a private landlord were not seen to be clearly accepted in most of the bank lists we checked."
    },
    "ni-number-letter": {
      "question": "Is a National Insurance number letter useful? How long does it take?",
      "answer": "It may help, but you have to wait. People who live in the UK, have the right to work and are working, looking for work or have a job offer can apply; it can take up to 4 weeks, and some people's number already shows in their eVisa; as at 7 October 2026, one bank listed the HMRC letter as a document new arrivals can use."
    },
    "rejected": {
      "question": "The first bank turned me down. What now?",
      "answer": "One refusal doesn't mean other banks will refuse: each bank decides which documents it needs under its own risk processes. As at 7 October 2026, one bank stated that people without a listed proof of identity or a permanent UK address can talk to them in a branch.",
      "nextStep": "First ask why, then try another route, another account or another bank, and look into a basic account if needed."
    },
    "basic-account": {
      "question": "What is a Basic Bank Account, and who can open one?",
      "answer": "A simple sterling account with free standard transactions and no overdraft. Certain banks designated by the government must offer one to eligible people; broadly, the conditions are being legally resident in the UK, and not having another UK account with basic features, or not being eligible for any of that bank's other accounts.",
      "nextStep": "It is not for everyone; check that bank's conditions before applying."
    },
    "fscs": {
      "question": "Is money in a bank protected by the FSCS?",
      "answer": "If a UK-authorised bank, building society or credit union fails, the FSCS generally pays up to £120,000 per eligible depositor per authorised institution, for institutions that fail after 30 November 2025. Brands that share one banking licence count as the same bank."
    },
    "app-bank-protection": {
      "question": "Is money in an account opened through an app protected too?",
      "answer": "Whether you used an app doesn't decide protection; the type of firm does: if a UK-authorised bank fails, deposits are generally protected by the FSCS (up to a limit); money held with e-money institutions and payment institutions is not covered by FSCS deposit protection.",
      "nextStep": "Use the FSCS protection checker, or the FCA Financial Services Register, to check whether the firm is authorised and who it shares a licence with."
    }
  },
  "ur": {
    "no-address-proof": {
      "question": "ابھی برطانیہ کا پتے کا ثبوت نہیں، کیا اکاؤنٹ کھل سکتا ہے؟",
      "answer": "ضروری نہیں کہ نہ کھلے۔ زیادہ تر بینک پتے کا ثبوت مانگتے ہیں یا مانگ سکتے ہیں، لیکن کون سے کاغذات اور کس طریقے سے قبول ہوتے ہیں، یہ ہر بینک میں مختلف ہے؛ 7 اکتوبر 2026 تک کچھ بینکوں نے یونیورسٹی کے داخلے کی تصدیق کے خط یا HMRC کے خط جیسے متبادل کاغذات درج کیے تھے۔",
      "nextStep": "پہلے جس بینک اور اکاؤنٹ کی درخواست دے رہے ہیں اس کی فہرست دیکھیں، آن لائن اور برانچ الگ الگ، پھر اس کے لکھے ہوئے متبادل کاغذات تلاش کریں۔"
    },
    "law-vs-bank": {
      "question": "کیا قانون کہتا ہے کہ اکاؤنٹ کھولنے کے لیے پتے کا ثبوت دینا لازمی ہے؟",
      "answer": "اینٹی منی لانڈرنگ قواعد بینکوں سے آپ کی شناخت اور اس کی تصدیق کا تقاضا کرتے ہیں، لیکن تمام بینکوں کے لیے کاغذات کی کوئی یکساں فہرست مقرر نہیں کرتے؛ پتے کا ثبوت چاہیے یا نہیں اور کون سے کاغذات قبول ہوں، یہ ہر بینک اپنے خطرے کے طریقۂ کار سے طے کرتا ہے۔ عملی طور پر زیادہ تر بینک پتے کا ثبوت مانگتے ہیں یا مانگ سکتے ہیں۔",
      "nextStep": "اس لیے دیکھنا یہ ہے کہ جس بینک اور اکاؤنٹ کی آپ درخواست دے رہے ہیں وہ اس وقت کیا قبول کرتا ہے۔"
    },
    "identity-documents": {
      "question": "شناخت کے لیے کیا تیار کروں؟",
      "answer": "پہلے یقینی بنائیں کہ چینی پاسپورٹ مدت کے اندر ہے، اور eVisa جیسا برطانوی امیگریشن حیثیت کا ثبوت تیار رکھیں۔ 7 اکتوبر 2026 تک ایک بینک نے لکھا تھا کہ غیر برطانوی / غیر یورپی یونین پاسپورٹ کے ساتھ درست ویزا یا eVisa share code ضروری ہے۔",
      "nextStep": "ضرورت ہو تو UKVI اکاؤنٹ میں share code بنائیں، یہ 90 دن کے لیے درست ہے اور ختم ہونے پر نیا بنایا جا سکتا ہے۔"
    },
    "evisa-no-brp": {
      "question": "صرف eVisa ہے، BRP نہیں، کیا اکاؤنٹ کھل سکتا ہے؟",
      "answer": "اس وجہ سے یہ نہ سمجھیں کہ نہیں کھلے گا۔ برطانوی حکومت کے مطابق eVisa نے کاغذی امیگریشن دستاویزات کی جگہ لے لی ہے، بس اتنا ہے کہ 7 اکتوبر 2026 تک کچھ بینکوں کی کاغذات کی فہرست میں اب بھی BRP لکھا تھا۔",
      "nextStep": "پہلے دیکھیں کہ یہ بینک اب کیا لکھتا ہے، ضرورت ہو تو سیدھا بینک سے پوچھیں۔"
    },
    "student-account": {
      "question": "کیا ابھی آئے بین الاقوامی طالب علم طلبہ اکاؤنٹ کھول سکتے ہیں؟",
      "answer": "ضروری نہیں۔ 7 اکتوبر 2026 تک کئی بینکوں کے طلبہ اکاؤنٹس کے لیے برطانیہ میں تقریباً تین سال رہائش ضروری تھی، اس لیے ابھی پہنچنے والوں کے لیے شاید موزوں نہ ہوں؛ یہ بینک یہ بھی بتاتے ہیں کہ شرط پوری نہ کرنے والے ان کے دوسرے اکاؤنٹس دیکھیں۔",
      "nextStep": "اس بینک کے دوسرے اکاؤنٹس کی اہلیت کی شرائط دیکھیں، یا دوسرے بینکوں کے اکاؤنٹس کا موازنہ کریں۔"
    },
    "school-letter": {
      "question": "کیا یونیورسٹی کا bank letter لازمی ہے؟",
      "answer": "قواعد نے بینکوں کے لیے کاغذات کی کوئی یکساں فہرست مقرر نہیں کی، اور نہ بین الاقوامی طلبہ سے یونیورسٹی کا خط لازمی مانگا ہے؛ یہ مفید ہے یا نہیں اور کس مرحلے پر، یہ بینک پر منحصر ہے۔ 7 اکتوبر 2026 تک کچھ بینکوں نے یونیورسٹی کے داخلے کی تصدیق کا خط یا university banking letter قابلِ استعمال کاغذات میں درج کیا تھا۔",
      "nextStep": "پہلے یونیورسٹی سے پوچھیں کہ کون سے تصدیقی خط دے سکتی ہے، پھر جس بینک کی درخواست دے رہے ہیں اس کی فہرست سے ملائیں۔"
    },
    "employer-letter-tenancy": {
      "question": "کیا آجر کا خط یا کرائے کا معاہدہ پتے کے ثبوت کے طور پر چلے گا؟",
      "answer": "ہر بینک قبول نہیں کرتا۔ 7 اکتوبر 2026 تک ایک بینک برانچ میں \"معروف آجر\" کا وہ خط قبول کرتا تھا جو پتے اور ملازمت کی تصدیق کرے؛ کرائے کے معاہدے کی قبولیت میں بہت فرق ہے، اور نجی مالک مکان کے ساتھ سیدھے کیے گئے معاہدے کی واضح قبولیت ہماری دیکھی ہوئی زیادہ تر بینک فہرستوں میں نظر نہیں آئی۔"
    },
    "ni-number-letter": {
      "question": "کیا نیشنل انشورنس نمبر کا اطلاعی خط مفید ہے؟ کتنا انتظار کرنا پڑتا ہے؟",
      "answer": "مفید ہو سکتا ہے، لیکن انتظار کرنا پڑتا ہے۔ جو برطانیہ میں رہتے ہوں، کام کا حق رکھتے ہوں، اور کام کر رہے ہوں / کام ڈھونڈ رہے ہوں / ملازمت کی پیشکش ہو، وہ درخواست دے سکتے ہیں، زیادہ سے زیادہ 4 ہفتے لگ سکتے ہیں، اور کچھ لوگوں کا نمبر پہلے سے eVisa میں نظر آتا ہے؛ 7 اکتوبر 2026 تک ایک بینک نے HMRC کے خط کو نئے آنے والوں کے قابلِ استعمال کاغذات میں درج کیا تھا۔"
    },
    "rejected": {
      "question": "پہلے بینک نے انکار کر دیا، اب کیا کروں؟",
      "answer": "ایک بینک کے انکار کا مطلب یہ نہیں کہ دوسرے بھی انکار کریں گے: ہر بینک اپنے خطرے کے طریقۂ کار سے طے کرتا ہے کہ کون سے کاغذات چاہئیں۔ 7 اکتوبر 2026 تک ایک بینک نے لکھا تھا کہ فہرست والی شناختی دستاویز یا برطانیہ کا مستقل پتا نہ ہو تو برانچ میں بات کی جا سکتی ہے۔",
      "nextStep": "پہلے وجہ پوچھیں، پھر طریقہ، اکاؤنٹ یا بینک بدل کر دیکھیں، ضرورت ہو تو بنیادی اکاؤنٹ کے بارے میں جانیں۔"
    },
    "basic-account": {
      "question": "بنیادی اکاؤنٹ (Basic Bank Account) کیا ہے؟ کون کھول سکتا ہے؟",
      "answer": "یہ ایک سادہ پاؤنڈ اکاؤنٹ ہے، معمول کے لین دین مفت ہیں، اور اوور ڈرافٹ نہیں۔ حکومت کے نامزد کچھ بینکوں کو یہ اہل افراد کو دینا ہوتا ہے، شرائط موٹے طور پر یہ ہیں: برطانیہ میں قانونی رہائش، اور بنیادی سہولتوں والا کوئی دوسرا برطانوی اکاؤنٹ نہ ہونا، یا اس بینک کے باقی تمام اکاؤنٹس کی شرائط پوری نہ ہونا۔",
      "nextStep": "یہ ہر کسی کے لیے نہیں؛ درخواست سے پہلے اس بینک کی شرائط دیکھ لیں۔"
    },
    "fscs": {
      "question": "بینک میں رکھے پیسے کو FSCS کا تحفظ حاصل ہے؟",
      "answer": "برطانیہ کا مجاز بینک، بلڈنگ سوسائٹی یا کریڈٹ یونین بند ہو تو FSCS عام طور پر ہر اہل جمع کنندہ، ہر مجاز ادارے کو £120,000 تک ادا کرتی ہے، یہ 30 نومبر 2025 کے بعد بند ہونے والے اداروں پر لاگو ہے۔ ایک بینکنگ لائسنس شیئر کرنے والے برانڈ ایک ہی بینک شمار ہوتے ہیں۔"
    },
    "app-bank-protection": {
      "question": "app سے کھولے گئے اکاؤنٹ کے پیسے بھی محفوظ ہیں؟",
      "answer": "app استعمال کرنا تحفظ طے نہیں کرتا، ادارے کی قسم طے کرتی ہے: برطانیہ کا مجاز بینک بند ہو تو ڈپازٹ عام طور پر FSCS کے تحفظ میں ہیں (ایک حد تک)؛ الیکٹرانک منی اداروں اور ادائیگی کے اداروں میں رکھی رقم FSCS کے ڈپازٹ تحفظ میں شامل نہیں۔",
      "nextStep": "FSCS کا تحفظ جانچنے والا ٹول، یا FCA کا Financial Services Register استعمال کر کے دیکھیں کہ ادارہ مجاز ہے یا نہیں اور کس کے ساتھ لائسنس شیئر کرتا ہے۔"
    }
  },
  "hi": {
    "no-address-proof": {
      "question": "अभी ब्रिटेन का पते का प्रमाण नहीं है, क्या खाता खुल सकता है?",
      "answer": "ज़रूरी नहीं कि न खुले। ज़्यादातर बैंक पते का प्रमाण माँगते हैं या माँग सकते हैं, लेकिन कौन-से दस्तावेज़ और किस तरीके से स्वीकार होते हैं, यह हर बैंक में अलग है; 7 अक्टूबर 2026 तक कुछ बैंकों ने यूनिवर्सिटी के दाख़िले की पुष्टि वाले पत्र या HMRC के पत्र जैसे वैकल्पिक दस्तावेज़ दर्ज किए थे।",
      "nextStep": "पहले जिस बैंक और खाते के लिए आवेदन कर रहे हैं उसकी सूची देखें, ऑनलाइन और ब्रांच अलग-अलग, फिर उसके लिखे वैकल्पिक दस्तावेज़ ढूँढें।"
    },
    "law-vs-bank": {
      "question": "क्या क़ानून कहता है कि खाता खोलने के लिए पते का प्रमाण देना ज़रूरी है?",
      "answer": "मनी लॉन्ड्रिंग विरोधी नियम बैंकों से आपकी पहचान करने और उसकी पुष्टि करने को कहते हैं, लेकिन सभी बैंकों के लिए दस्तावेज़ों की कोई एक समान सूची तय नहीं करते; पते का प्रमाण चाहिए या नहीं और कौन-से दस्तावेज़ स्वीकार हों, यह हर बैंक अपनी जोखिम प्रक्रिया से तय करता है। असल में ज़्यादातर बैंक पते का प्रमाण माँगते हैं या माँग सकते हैं।",
      "nextStep": "इसलिए देखना यह है कि जिस बैंक और खाते के लिए आप आवेदन कर रहे हैं वह अभी क्या स्वीकार करता है।"
    },
    "identity-documents": {
      "question": "पहचान के लिए क्या तैयार करूँ?",
      "answer": "पहले पक्का करें कि चीनी पासपोर्ट वैध है, और eVisa जैसा ब्रिटिश इमिग्रेशन स्थिति का प्रमाण तैयार रखें। 7 अक्टूबर 2026 तक एक बैंक ने लिखा था कि ग़ैर-ब्रिटिश / ग़ैर-यूरोपीय संघ पासपोर्ट के साथ वैध वीज़ा या eVisa share code ज़रूरी है।",
      "nextStep": "ज़रूरत हो तो UKVI खाते में share code बनाएँ, यह 90 दिन तक वैध रहता है और ख़त्म होने पर नया बनाया जा सकता है।"
    },
    "evisa-no-brp": {
      "question": "सिर्फ़ eVisa है, BRP नहीं, क्या खाता खुल सकता है?",
      "answer": "इस वजह से यह न मानें कि नहीं खुलेगा। ब्रिटेन सरकार के अनुसार eVisa ने काग़ज़ी इमिग्रेशन दस्तावेज़ों की जगह ले ली है, बस इतना है कि 7 अक्टूबर 2026 तक कुछ बैंकों की दस्तावेज़ सूची में अब भी BRP लिखा था।",
      "nextStep": "पहले देखें कि यह बैंक अब क्या लिखता है, ज़रूरत हो तो सीधे बैंक से पूछें।"
    },
    "student-account": {
      "question": "क्या अभी आए अंतरराष्ट्रीय छात्र छात्र खाता खोल सकते हैं?",
      "answer": "ज़रूरी नहीं। 7 अक्टूबर 2026 तक कई बैंकों के छात्र खातों के लिए ब्रिटेन में लगभग तीन साल रहना ज़रूरी था, इसलिए अभी पहुँचे लोगों के लिए शायद ठीक न हों; ये बैंक यह भी बताते हैं कि शर्त पूरी न करने वाले उनके दूसरे खाते देखें।",
      "nextStep": "इस बैंक के दूसरे खातों की पात्रता शर्तें देखें, या दूसरे बैंकों के खातों की तुलना करें।"
    },
    "school-letter": {
      "question": "क्या यूनिवर्सिटी का bank letter ज़रूरी है?",
      "answer": "नियमों ने बैंकों के लिए दस्तावेज़ों की कोई एक समान सूची तय नहीं की, और न ही अंतरराष्ट्रीय छात्रों से यूनिवर्सिटी का पत्र ज़रूरी किया है; यह काम का है या नहीं और किस चरण में, यह बैंक पर निर्भर है। 7 अक्टूबर 2026 तक कुछ बैंकों ने यूनिवर्सिटी के दाख़िले की पुष्टि वाला पत्र या university banking letter इस्तेमाल लायक़ दस्तावेज़ों में दर्ज किया था।",
      "nextStep": "पहले यूनिवर्सिटी से पूछें कि कौन-से प्रमाण-पत्र दे सकती है, फिर जिस बैंक के लिए आवेदन कर रहे हैं उसकी सूची से मिलाएँ।"
    },
    "employer-letter-tenancy": {
      "question": "क्या नियोक्ता का पत्र या किराए का अनुबंध पते के प्रमाण के रूप में चलेगा?",
      "answer": "हर बैंक स्वीकार नहीं करता। 7 अक्टूबर 2026 तक एक बैंक ब्रांच में \"जाने-माने नियोक्ता\" का वह पत्र स्वीकार करता था जो पते और नौकरी की पुष्टि करे; किराए के अनुबंध की स्वीकार्यता में बहुत फ़र्क़ है, और निजी मकान मालिक से सीधे किए गए अनुबंध की साफ़ स्वीकार्यता हमारी देखी ज़्यादातर बैंक सूचियों में नहीं दिखी।"
    },
    "ni-number-letter": {
      "question": "क्या राष्ट्रीय बीमा नंबर का सूचना पत्र काम का है? कितना इंतज़ार करना पड़ता है?",
      "answer": "काम का हो सकता है, लेकिन इंतज़ार करना पड़ता है। जो ब्रिटेन में रहते हों, काम करने का अधिकार रखते हों, और काम कर रहे हों / काम ढूँढ रहे हों / नौकरी का प्रस्ताव हो, वे आवेदन कर सकते हैं, ज़्यादा से ज़्यादा 4 हफ़्ते लग सकते हैं, और कुछ लोगों का नंबर पहले से eVisa में दिखता है; 7 अक्टूबर 2026 तक एक बैंक ने HMRC के पत्र को नए आने वालों के इस्तेमाल लायक़ दस्तावेज़ों में दर्ज किया था।"
    },
    "rejected": {
      "question": "पहले बैंक ने मना कर दिया, अब क्या करूँ?",
      "answer": "एक बैंक के मना करने का मतलब यह नहीं कि दूसरे भी मना करेंगे: हर बैंक अपनी जोखिम प्रक्रिया से तय करता है कि कौन-से दस्तावेज़ चाहिए। 7 अक्टूबर 2026 तक एक बैंक ने लिखा था कि सूची वाला पहचान दस्तावेज़ या ब्रिटेन का स्थायी पता न हो तो ब्रांच में बात की जा सकती है।",
      "nextStep": "पहले कारण पूछें, फिर तरीका, खाता या बैंक बदलकर देखें, ज़रूरत हो तो बुनियादी खाते के बारे में जानें।"
    },
    "basic-account": {
      "question": "बुनियादी खाता (Basic Bank Account) क्या है? कौन खोल सकता है?",
      "answer": "यह एक सरल पाउंड खाता है, सामान्य लेन-देन मुफ़्त हैं, और ओवरड्राफ़्ट नहीं। सरकार द्वारा नामित कुछ बैंकों को यह पात्र लोगों को देना होता है, शर्तें मोटे तौर पर ये हैं: ब्रिटेन में क़ानूनी रूप से रहना, और बुनियादी सुविधाओं वाला कोई दूसरा ब्रिटिश खाता न होना, या इस बैंक के बाक़ी सभी खातों की शर्तें पूरी न होना।",
      "nextStep": "यह हर किसी के लिए नहीं है; आवेदन से पहले इस बैंक की शर्तें देख लें।"
    },
    "fscs": {
      "question": "बैंक में रखे पैसे को FSCS की सुरक्षा मिलती है?",
      "answer": "ब्रिटेन का अधिकृत बैंक, बिल्डिंग सोसाइटी या क्रेडिट यूनियन बंद हो तो FSCS आम तौर पर हर पात्र जमाकर्ता, हर अधिकृत संस्था को £120,000 तक देती है, यह 30 नवंबर 2025 के बाद बंद होने वाली संस्थाओं पर लागू है। एक बैंकिंग लाइसेंस साझा करने वाले ब्रांड एक ही बैंक गिने जाते हैं।"
    },
    "app-bank-protection": {
      "question": "app से खोले गए खाते का पैसा भी सुरक्षित है?",
      "answer": "app इस्तेमाल करना सुरक्षा तय नहीं करता, संस्था का प्रकार तय करता है: ब्रिटेन का अधिकृत बैंक बंद हो तो जमा राशि आम तौर पर FSCS की सुरक्षा में है (एक सीमा तक); इलेक्ट्रॉनिक मनी संस्थाओं और भुगतान संस्थाओं में रखा पैसा FSCS की जमा सुरक्षा में शामिल नहीं है।",
      "nextStep": "FSCS का सुरक्षा जाँच टूल, या FCA का Financial Services Register इस्तेमाल करके देखें कि संस्था अधिकृत है या नहीं और किसके साथ लाइसेंस साझा करती है।"
    }
  }
};

const FINGERPRINTS: Record<Exclude<GuideLocale, "zh-CN">, Record<string, string>> = {
  "zh-TW": {
    "no-address-proof": "8dd99287",
    "law-vs-bank": "a2b589e5",
    "identity-documents": "50571f01",
    "evisa-no-brp": "472f0dde",
    "student-account": "632b97e1",
    "school-letter": "24445b55",
    "employer-letter-tenancy": "bf719498",
    "ni-number-letter": "e3930486",
    "rejected": "8aa083cb",
    "basic-account": "3af8f668",
    "fscs": "5ffb2394",
    "app-bank-protection": "7654c53c"
  },
  "en": {
    "no-address-proof": "c2a39a81",
    "law-vs-bank": "4392bef2",
    "identity-documents": "2a0f16af",
    "evisa-no-brp": "970b7b57",
    "student-account": "38dc4948",
    "school-letter": "54b02339",
    "employer-letter-tenancy": "07a8fe52",
    "ni-number-letter": "3e5d48c8",
    "rejected": "13ca24d7",
    "basic-account": "d3b1db11",
    "fscs": "814e0606",
    "app-bank-protection": "bee5108a"
  },
  "ur": {
    "no-address-proof": "2f168fce",
    "law-vs-bank": "17f4b414",
    "identity-documents": "b5855d79",
    "evisa-no-brp": "2fdda134",
    "student-account": "b2df247f",
    "school-letter": "9476c4ca",
    "employer-letter-tenancy": "5985c353",
    "ni-number-letter": "3b7db90b",
    "rejected": "b4358366",
    "basic-account": "05fde145",
    "fscs": "ebd4c716",
    "app-bank-protection": "cc3f3ca2"
  },
  "hi": {
    "no-address-proof": "afcc1fa5",
    "law-vs-bank": "0d4a17f6",
    "identity-documents": "e89dc13f",
    "evisa-no-brp": "24a3a124",
    "student-account": "2a4bcc70",
    "school-letter": "9596bfac",
    "employer-letter-tenancy": "e4358da6",
    "ni-number-letter": "18088fc3",
    "rejected": "ddab1d10",
    "basic-account": "59e714c1",
    "fscs": "5d093e54",
    "app-bank-protection": "99be5483"
  }
};

/** The Quick Answer set for a locale; zh-CN is the reviewed original. */
export function moneyQuickAnswersFor(locale: GuideLocale): QuickAnswerSet {
  if (locale === "zh-CN") return MONEY_QUICK_ANSWERS;
  return {
    ...MONEY_QUICK_ANSWERS,
    answers: MONEY_QUICK_ANSWERS.answers.map((answer) => {
      const wording = WORDING[locale][answer.id];
      return {
        ...answer,
        question: wording.question,
        answer: wording.answer,
        nextStep: wording.nextStep,
        evidenceFingerprint: FINGERPRINTS[locale][answer.id],
      };
    }),
  };
}
