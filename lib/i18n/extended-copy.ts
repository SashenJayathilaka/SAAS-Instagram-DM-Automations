import fr from "./catalogs/fr.json";
import es from "./catalogs/es.json";
import de from "./catalogs/de.json";
import pt from "./catalogs/pt.json";
import type { Locale } from "./config";

// Repository-owned static copy. Drafted locally; explicit editorial catalogs
// override these entries. No runtime translation service or customer data.
export const EXTENDED_COPY: Record<Locale, Record<string, string>> = { en: {}, fr, es, de, pt };
