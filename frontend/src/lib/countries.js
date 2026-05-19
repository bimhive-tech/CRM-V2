import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const countryOptions = Object.entries(countries.getNames("en", { select: "official" }))
  .map(([code, name]) => ({ code, name }))
  .sort((left, right) => left.name.localeCompare(right.name, "en"));

export const COUNTRY_OPTIONS = countryOptions;
export const DEFAULT_COUNTRY = "Egypt";
