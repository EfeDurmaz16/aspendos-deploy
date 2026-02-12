import { Config } from '@remotion/cli/config';

// Note: Tailwind integration disabled due to v4/v3 conflict in monorepo
// Using plain CSS utilities instead

Config.overrideWebpackConfig((currentConfiguration) => {
  // Remove PostCSS loader to avoid Tailwind v4 conflict
  if (currentConfiguration.module?.rules) {
    currentConfiguration.module.rules = currentConfiguration.module.rules.map((rule) => {
      if (typeof rule === 'object' && rule !== null && 'test' in rule) {
        const testRule = rule as { test?: RegExp; use?: unknown[] };
        if (testRule.test?.toString().includes('css')) {
          // Filter out postcss-loader
          if (Array.isArray(testRule.use)) {
            testRule.use = testRule.use.filter((loader) => {
              if (typeof loader === 'string') {
                return !loader.includes('postcss-loader');
              }
              if (typeof loader === 'object' && loader !== null && 'loader' in loader) {
                return !(loader as { loader: string }).loader.includes('postcss-loader');
              }
              return true;
            });
          }
        }
      }
      return rule;
    });
  }
  return currentConfiguration;
});
