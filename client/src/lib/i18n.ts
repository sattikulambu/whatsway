/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import enTranslations from "./translations/en.json";
import esTranslations from "./translations/es.json";
import frTranslations from "./translations/fr.json";
import deTranslations from "./translations/de.json";
import ptTranslations from "./translations/pt.json";
import arTranslations from "./translations/ar.json";
import hiTranslations from "./translations/hi.json";
import zhTranslations from "./translations/zh.json";

export interface LanguageConfig {
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  flag: string;
}

const staticLanguages: Record<string, LanguageConfig> = {
  en: { name: "English", nativeName: "En", direction: "ltr", flag: "🇬🇧" },
  es: { name: "Spanish", nativeName: "Es", direction: "ltr", flag: "🇪🇸" },
  fr: { name: "French", nativeName: "Fr", direction: "ltr", flag: "🇫🇷" },
  de: { name: "German", nativeName: "De", direction: "ltr", flag: "🇩🇪" },
  pt: { name: "Portuguese", nativeName: "Pt", direction: "ltr", flag: "🇧🇷" },
  ar: { name: "Arabic", nativeName: "Ar", direction: "rtl", flag: "🇸🇦" },
  hi: { name: "Hindi", nativeName: "Hi", direction: "ltr", flag: "🇮🇳" },
  zh: { name: "Chinese", nativeName: "Zh", direction: "ltr", flag: "🇨🇳" },
};

const staticTranslations: Record<string, any> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  pt: ptTranslations,
  ar: arTranslations,
  hi: hiTranslations,
  zh: zhTranslations,
};

interface I18nState {
  language: string;
  languages: Record<string, LanguageConfig>;
  translationsCache: Record<string, any>;
  isLoadingLanguages: boolean;
  setLanguage: (language: string) => void;
  t: (path: string, variables?: Record<string, string | number>) => string;
  fetchEnabledLanguages: () => Promise<void>;
  loadTranslations: (code: string) => Promise<any>;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: "en",
      languages: { ...staticLanguages },
      translationsCache: { ...staticTranslations },
      isLoadingLanguages: false,

      fetchEnabledLanguages: async () => {
        try {
          set({ isLoadingLanguages: true });
          const response = await fetch("/api/languages/enabled");
          if (!response.ok) throw new Error("Failed to fetch languages");
          const data = await response.json();

          const dynamicLanguages: Record<string, LanguageConfig> = {};
          for (const lang of data) {
            dynamicLanguages[lang.code] = {
              name: lang.name,
              nativeName: lang.nativeName || lang.name.substring(0, 2),
              direction: lang.direction || "ltr",
              flag: lang.icon || "",
            };
          }

          set({ languages: dynamicLanguages, isLoadingLanguages: false });

          const currentLang = get().language;
          if (!dynamicLanguages[currentLang]) {
            const defaultLang = data.find((l: any) => l.isDefault);
            const fallback = defaultLang?.code || "en";
            get().setLanguage(fallback);
          }
        } catch (error) {
          console.error("Failed to fetch languages, using static fallback:", error);
          set({ languages: { ...staticLanguages }, isLoadingLanguages: false });
        }
      },

      loadTranslations: async (code: string) => {
        const cache = get().translationsCache;
        if (cache[code]) return cache[code];

        try {
          const response = await fetch(`/api/languages/translations/${code}`);
          if (!response.ok) throw new Error("Failed to fetch translations");
          const translations = await response.json();

          set((state) => ({
            translationsCache: { ...state.translationsCache, [code]: translations },
          }));

          return translations;
        } catch (error) {
          console.error(`Failed to load translations for ${code}:`, error);
          const fallback = staticTranslations[code] || staticTranslations.en;
          set((state) => ({
            translationsCache: { ...state.translationsCache, [code]: fallback },
          }));
          return fallback;
        }
      },

      setLanguage: async (language: string) => {
        const state = get();
        let translations = state.translationsCache[language];

        if (!translations) {
          translations = await state.loadTranslations(language);
        }

        set({ language });

        const langConfig = state.languages[language];
        if (langConfig) {
          document.documentElement.dir = langConfig.direction;
          document.documentElement.lang = language;
        }
      },

      t: (path: string, variables?: Record<string, string | number>) => {
        const state = get();
        const currentTranslations =
          state.translationsCache[state.language] ||
          staticTranslations[state.language] ||
          staticTranslations.en;

        const keys = path.split(".");
        let value: any = currentTranslations;

        for (const key of keys) {
          value = value?.[key];
          if (!value) break;
        }

        let result = value || path;

        if (variables && typeof result === "string") {
          Object.keys(variables).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            result = result.replace(regex, String(variables[key]));
          });
        }

        return result;
      },
    }),
    {
      name: "i18n-storage",
      partialize: (state) => ({ language: state.language }),
    }
  )
);

export function useTranslation() {
  const { t, language, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages } = useI18n();
  return { t, language, setLanguage, languages, fetchEnabledLanguages, isLoadingLanguages };
}

export type Language = string;
