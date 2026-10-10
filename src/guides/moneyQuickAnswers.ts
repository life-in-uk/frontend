// Quick Answers for Money & Finance: short, editorially written answers to
// common newcomer questions, each traceable to the published Guide.
//
// This is presentation configuration, not a knowledge base. Every answer
// restates wording from the Guide `open-uk-bank-account-new-arrival` and
// cites only evidence keys attached to those sentences in that Guide. At
// runtime an answer is shown only when the fetched Guide is the version these
// answers were reviewed against and every cited evidence item (with its
// sources) is present; otherwise the reader is sent to the full Guide.
// The shape mirrors what a backend-managed Quick Answer could later provide.

import type { GuideDetail, GuideEvidence } from "./api";
import { evidenceFingerprint } from "./evidenceIntegrity.ts";

export type QuickAnswer = {
  id: string;
  question: string;
  /** The short answer: the direct reply first, qualifications kept. */
  answer: string;
  /** One practical next step, when the Guide supports one. */
  nextStep?: string;
  /** Evidence keys from the Guide that support the answer's claims. */
  evidenceKeys: readonly string[];
  /**
   * Fingerprint of the cited evidence (statements, supports and their
   * sources) as reviewed. If the evidence changes, even without a new Guide
   * version, the answer is withheld until it is re-reviewed.
   */
  evidenceFingerprint: string;
};

export type QuickAnswerSet = {
  guideSlug: string;
  /** The Guide `updatedAt` these answers were checked against. */
  reviewedUpdatedAt: string;
  answers: readonly QuickAnswer[];
};

export const MONEY_QUICK_ANSWERS: QuickAnswerSet = {
  guideSlug: "open-uk-bank-account-new-arrival",
  reviewedUpdatedAt: "2026-10-07T15:53:00Z",
  answers: [
    {
      id: "no-address-proof",
      question: "还没有英国地址证明，能开户吗？",
      answer:
        "不一定开不了。大多数银行会要求或可能要求地址证明，但接受哪些文件、在哪个渠道接受，各家不同；截至 2026 年 10 月 7 日，有银行列出大学的录取确认信或 HMRC 通知信等替代文件。",
      nextStep:
        "先查你要申请的那家银行、那个账户的清单，网上和网点分开看，再找它写明的替代文件。",
      evidenceKeys: [
        "providers-ask-for-address",
        "hsbc-university-and-employer-letters",
        "natwest-new-to-uk-alternatives",
      ],
      evidenceFingerprint: "9c1aabd3",
    },
    {
      id: "law-vs-bank",
      question: "法律规定开户必须交地址证明吗？",
      answer:
        "反洗钱法规要求银行识别并核实你的身份，但没有给所有银行定一张统一的开户文件清单；要不要地址证明、收哪些文件，由各家银行按自己的风险流程决定。实际上，大多数银行会要求或可能要求地址证明。",
      nextStep: "所以要看你申请的那家银行、那个账户现在接受什么。",
      evidenceKeys: [
        "mlr-identity-verification",
        "mlr-risk-based-cdd",
        "providers-ask-for-address",
      ],
      evidenceFingerprint: "84ce414d",
    },
    {
      id: "identity-documents",
      question: "身份方面要准备什么？",
      answer:
        "先确认中国护照在有效期内，并准备好 eVisa 等英国移民身份证明。截至 2026 年 10 月 7 日，有银行写明非英国 / 非欧盟护照要配合有效签证或 eVisa share code。",
      nextStep:
        "需要时在 UKVI 账户生成 share code，有效期 90 天，过期可以再生成。",
      evidenceKeys: [
        "evisa-replaced-physical-documents",
        "natwest-passport-with-visa-or-share-code",
        "evisa-share-code-90-days",
      ],
      evidenceFingerprint: "daee19df",
    },
    {
      id: "evisa-no-brp",
      question: "只有 eVisa、没有 BRP，能开户吗？",
      answer:
        "不要因此以为开不了。英国政府说明 eVisa 已经取代了实体移民文件，只是截至 2026 年 10 月 7 日，有些银行的文件清单里仍写着 BRP。",
      nextStep: "先看这家银行现在怎么写，必要时直接问银行。",
      evidenceKeys: [
        "evisa-replaced-physical-documents",
        "brp-still-listed-by-some-providers",
      ],
      evidenceFingerprint: "e74b60ef",
    },
    {
      id: "student-account",
      question: "刚到的留学生能开学生账户吗？",
      answer:
        "不一定。截至 2026 年 10 月 7 日，有几家银行的学生账户要求在英国住满大约三年，可能不适合刚落地的你；这些银行也提示，不符合的可以看他们的其他账户。",
      nextStep: "查看这家银行其他账户的资格条件，或比较其他银行的账户。",
      evidenceKeys: ["student-accounts-three-year-residence"],
      evidenceFingerprint: "c2b20ad1",
    },
    {
      id: "school-letter",
      question: "一定要学校开的 bank letter 吗？",
      answer:
        "法规没有给银行规定统一的文件清单，也没有要求留学生必须交学校的信；有没有用、用在哪一步，看具体银行。截至 2026 年 10 月 7 日，有银行把大学的录取确认信或 university banking letter 列为可用材料。",
      nextStep: "先问学校能开哪些证明信，再对照你要申请的那家银行的清单。",
      evidenceKeys: [
        "mlr-risk-based-cdd",
        "hsbc-university-and-employer-letters",
        "santander-basic-for-new-uk-students",
      ],
      evidenceFingerprint: "8003ad25",
    },
    {
      id: "employer-letter-tenancy",
      question: "雇主的信、租房合同能当地址证明吗？",
      answer:
        "不是所有银行都收。截至 2026 年 10 月 7 日，有银行在网点接受“已知雇主”出具的确认住址和在职的信；租房合同的接受范围差别很大，私人房东直接签的合同在我们查看的多数银行清单里没有看到明确接受。",
      evidenceKeys: [
        "hsbc-university-and-employer-letters",
        "tenancy-agreement-varies",
      ],
      evidenceFingerprint: "327d1d5d",
    },
    {
      id: "ni-number-letter",
      question: "国民保险号的通知信有用吗？要等多久？",
      answer:
        "可能有用，但要等。住在英国、有工作权、正在工作 / 找工作 / 有工作 offer 的人可以申请，可能要最多 4 周，有些人的号码已显示在 eVisa 里；截至 2026 年 10 月 7 日，有银行把 HMRC 通知信列为新来的人可用的文件。",
      evidenceKeys: [
        "ni-number-eligibility-and-timing",
        "natwest-new-to-uk-alternatives",
      ],
      evidenceFingerprint: "4e824bfa",
    },
    {
      id: "rejected",
      question: "第一家银行拒绝了，怎么办？",
      answer:
        "一家拒绝不代表其他家也会拒绝：每家银行按自己的风险流程决定要哪些文件。截至 2026 年 10 月 7 日，有的银行写明，没有清单上的身份文件或固定英国地址时，可以去网点谈。",
      nextStep: "先问清原因，再试换渠道、换账户、换银行，必要时了解基本账户。",
      evidenceKeys: [
        "mlr-risk-based-cdd",
        "santander-branch-help-without-listed-documents",
      ],
      evidenceFingerprint: "289fec27",
    },
    {
      id: "basic-account",
      question: "基本账户（Basic Bank Account）是什么？谁能开？",
      answer:
        "一种功能简单的英镑账户，标准操作免费，没有透支。政府指定的一些银行要向符合条件的人提供，条件大致是合法居住在英国，并且没有其他具备基本功能的英国账户，或不符合这家银行其他所有账户的条件。",
      nextStep: "它不是人人都能开；申请前看清这家银行的条件。",
      evidenceKeys: [
        "basic-account-features",
        "basic-account-designated-institutions",
        "basic-account-eligibility",
      ],
      evidenceFingerprint: "05e4e25f",
    },
    {
      id: "fscs",
      question: "钱存在银行，有 FSCS 保障吗？",
      answer:
        "英国授权的银行、住房互助会或信用合作社倒闭时，FSCS 一般对每位符合条件的存款人、每家授权机构赔付最多 £120,000，适用于 2025 年 11 月 30 日之后倒闭的机构。共用一张银行牌照的品牌按同一家算。",
      evidenceKeys: ["fscs-120k-limit", "fscs-shared-licence"],
      evidenceFingerprint: "d60a9cd1",
    },
    {
      id: "app-bank-protection",
      question: "用 app 开的账户，钱也受保障吗？",
      answer:
        "用不用 app 不决定保障，要看机构类型：英国授权的银行倒闭时，存款一般受 FSCS 保障（有上限）；电子货币机构和支付机构里的钱不受 FSCS 存款保障。",
      nextStep:
        "用 FSCS 的保障查询工具，或在 FCA 金融服务登记册上查这家机构是否获得授权、和谁共用牌照。",
      evidenceKeys: [
        "fscs-120k-limit",
        "fscs-emoney-not-covered",
        "fscs-how-to-check",
      ],
      evidenceFingerprint: "b471a9cb",
    },
  ],
};

export type ResolvedQuickAnswer = QuickAnswer & {
  /** Present only when the cited evidence resolved and is unchanged. */
  evidence: GuideEvidence[] | null;
};

// Shared with the Family & Visa navigator; re-exported for existing callers.
export { evidenceFingerprint };

/**
 * Pairs each answer with its evidence from the fetched Guide. An answer is
 * verified only if the Guide is the expected one, at the reviewed version;
 * each cited key exists with at least one support whose source exists; and
 * the cited evidence still matches the fingerprint it was reviewed against.
 */
export function resolveQuickAnswers(
  set: QuickAnswerSet,
  guide: GuideDetail,
  category: string,
): ResolvedQuickAnswer[] {
  const sameGuide =
    guide.slug === set.guideSlug &&
    guide.category === category &&
    guide.updatedAt === set.reviewedUpdatedAt;
  const evidence = new Map(guide.evidence.map((item) => [item.key, item]));
  const sources = new Map(guide.sources.map((source) => [source.key, source]));
  return set.answers.map((answer) => {
    const cited = answer.evidenceKeys.map((key) => evidence.get(key));
    const resolved = cited.every(
      (item): item is GuideEvidence =>
        item !== undefined &&
        item.supports.length > 0 &&
        item.supports.every((support) => sources.has(support.sourceKey)),
    );
    const verified =
      sameGuide &&
      answer.evidenceKeys.length > 0 &&
      resolved &&
      evidenceFingerprint(cited as GuideEvidence[], sources) ===
        answer.evidenceFingerprint;
    return {
      ...answer,
      evidence: verified ? (cited as GuideEvidence[]) : null,
    };
  });
}
