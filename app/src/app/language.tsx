"use client";
import { useEffect, useSyncExternalStore } from "react";

export const LANGUAGE_REVIEW = process.env.NEXT_PUBLIC_CEBUANO_REVIEW === "1";
const draft: Record<string, string> = {
  "Soil water": "Tubig sa yuta", "Town": "Lungsod", "Select a town": "Pagpili og lungsod",
  "Pixels with data": "Mga pixel nga adunay datos", "Towns with data": "Mga lungsod nga adunay datos",
  "Rank preview": "Pasiuna nga han-ay", "Rank parts": "Mga bahin sa han-ay", "No data": "Walay datos",
  "Not ranked": "Wala sa han-ay", "Dryness": "Pagkauga", "Drying speed": "Kapaspas sa pagkauga", "People": "Mga tawo",
  "drier": "mas uga", "wetter": "mas basa", "All towns, mean soil water": "Tanang lungsod, kasagarang tubig sa yuta",
  "Play": "Ipatugtog", "Pause": "Ihunong", "Loop": "Balika", "Window": "12 ka adlaw", "Date": "Petsa",
  "Soil water before El Niño": "Tubig sa yuta sa wala pa ang El Niño",
  "Gray: less than half the pixels have data": "Abohon: ubos sa katunga sa mga pixel ang adunay datos",
  "Select a town on the map or in the list. Push play to see the season.": "Pagpili og lungsod sa mapa o sa listahan. Ipatugtog aron makita ang panahon.",
  "What happened to water before El Niño?": "Unsay nahitabo sa tubig sa wala pa ang El Niño?",
  "The mean soil water fell from about 0.35 to 0.25 m³/m³ at the end of July.": "Ang kasagarang tubig sa yuta miubos gikan sa mga 0.35 ngadto sa 0.25 m³/m³ sa kataposan sa Hulyo.",
  "The water area is steady now. In past dry events it fell in March.": "Lig-on karon ang gilapdon sa tubig. Sa nangaging uga nga mga panahon, miubos kini sa Marso.",
  "The radar signal of both rice parcels rose to its highest in September or October, then fell on 5 November.": "Ang signal sa radar sa duha ka parsela sa humayan misaka sa kinatas-an sa Septiyembre o Oktubre, unya miubos sa 5 Nobyembre.",
};
const subscribe = (notify: () => void) => { window.addEventListener("hubas-language", notify); window.addEventListener("storage", notify); return () => { window.removeEventListener("hubas-language", notify); window.removeEventListener("storage", notify); }; };
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, () => LANGUAGE_REVIEW && localStorage.getItem("hubas-language") === "ceb" ? "ceb" : "en", () => "en");
  return { language, t: (text: string) => language === "ceb" ? draft[text] ?? text : text };
}
export function LanguagePicker() {
  const { language } = useLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  if (!LANGUAGE_REVIEW) return null;
  return <label className="language-picker">Language <select aria-label="Language" value={language} onChange={event => {
    localStorage.setItem("hubas-language", event.target.value); window.dispatchEvent(new Event("hubas-language"));
  }}><option value="en">English</option><option value="ceb">Cebuano draft</option></select></label>;
}
export default function LanguageReview() {
  const { t } = useLanguage();
  if (!LANGUAGE_REVIEW) return null;
  return <section className="language-review" aria-label="Translation review"><strong>Unapproved Cebuano draft · speaker review required</strong>
    <p>{t("What happened to water before El Niño?")}</p><p>{t("The mean soil water fell from about 0.35 to 0.25 m³/m³ at the end of July.")}</p>
  </section>;
}
