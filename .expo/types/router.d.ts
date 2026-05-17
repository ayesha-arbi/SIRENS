/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/CommunityScreen`; params?: Router.UnknownInputParams; } | { pathname: `/HomeScreen`; params?: Router.UnknownInputParams; } | { pathname: `/LoginScreen`; params?: Router.UnknownInputParams; } | { pathname: `/onboardingScreen`; params?: Router.UnknownInputParams; } | { pathname: `/SignupScreen`; params?: Router.UnknownInputParams; } | { pathname: `/SplashScreen`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/CommunityScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/HomeScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/LoginScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/onboardingScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/SignupScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/SplashScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/CommunityScreen${`?${string}` | `#${string}` | ''}` | `/HomeScreen${`?${string}` | `#${string}` | ''}` | `/LoginScreen${`?${string}` | `#${string}` | ''}` | `/onboardingScreen${`?${string}` | `#${string}` | ''}` | `/SignupScreen${`?${string}` | `#${string}` | ''}` | `/SplashScreen${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/CommunityScreen`; params?: Router.UnknownInputParams; } | { pathname: `/HomeScreen`; params?: Router.UnknownInputParams; } | { pathname: `/LoginScreen`; params?: Router.UnknownInputParams; } | { pathname: `/onboardingScreen`; params?: Router.UnknownInputParams; } | { pathname: `/SignupScreen`; params?: Router.UnknownInputParams; } | { pathname: `/SplashScreen`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
