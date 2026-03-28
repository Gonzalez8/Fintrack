"use client";

import { useTranslations } from "@/i18n/use-translations";
import { PropertiesTab } from "./tabs/properties-tab";

export function PropertiesContent() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{t("properties.title")}</h1>
      <PropertiesTab />
    </div>
  );
}
