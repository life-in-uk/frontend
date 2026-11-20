import type { GuideLocale } from "./locales.ts";

export const HOUSEHOLD_CATEGORY = "household-services";

export const HOUSEHOLD_COPY: Record<GuideLocale, { title: string; description: string }> = {
  "zh-CN": { title: "家庭服务与保险", description: "比较英国的住宅、汽车和宠物保险，了解紧急维修、道路救援、宽带和能源合约。" },
  "zh-TW": { title: "家庭服務與保險", description: "比較英國的住宅、汽車和寵物保險，了解緊急維修、道路救援、寬頻和能源合約。" },
  en: { title: "Household Services & Insurance", description: "Compare home, car and pet insurance and find out what to check in emergency cover, breakdown cover, broadband and energy contracts." },
  ur: { title: "گھریلو خدمات اور انشورنس", description: "برطانیہ میں گھر، گاڑی اور پالتو جانور کی انشورنس کا موازنہ کریں۔ ہنگامی مرمت، سڑک پر مدد، براڈبینڈ اور توانائی کے معاہدے سمجھیں۔" },
  hi: { title: "घरेलू सेवाएँ और बीमा", description: "यूके में गृह, कार और पालतू जानवर के बीमा की तुलना करें। आपात मरम्मत, सड़क सहायता, ब्रॉडबैंड और ऊर्जा अनुबंधों में क्या देखें, जानें।" },
};
