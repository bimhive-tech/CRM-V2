export const themeInitScript = `
  (function () {
    var defaultTheme = "light";

    try {
      var storedTheme = window.localStorage.getItem("crm-theme");
      var theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : defaultTheme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = defaultTheme;
      document.documentElement.style.colorScheme = defaultTheme;
    }
  })();
`;
