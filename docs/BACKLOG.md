# Backlog

## B-1: Android app on Google Play, with a bottom banner ad

**Goal.** Publish the Dad-O-Matic as an Android app on Google Play, with one small ad pinned to
the bottom of the screen and always visible. The app shows the same jokes, ratings and Hall of
Groans as the website, through the same `/api`.

### Approach

Wrap the existing site in a native shell rather than rewriting it. There are two ways:

|                                           | **Capacitor** (recommended)                                                     | Trusted Web Activity (TWA)                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| What it is                                | A native Android project that ships `packages/web` inside the app, in a WebView | A thin app that opens the live site in Chrome, full screen                                                                           |
| Ads                                       | Google **AdMob**, the native mobile ad SDK, through a Capacitor AdMob plugin    | Only web ads (AdSense) inside the page. Not AdMob, because the content is Chrome, not app code. AdSense also needs a domain you own. |
| Updates                                   | Web changes need a new app release, unless the app loads the live site          | Deploying the site updates the app                                                                                                   |
| Fit for "ad always visible at the bottom" | Native anchored banner, outside the page, which cannot scroll away              | A fixed-position web ad, which is harder to keep clear of the page                                                                   |

**Recommendation: Capacitor + AdMob.** AdMob is Google's ad network for apps, and its _anchored
adaptive banner_ is exactly "small, along the bottom, always visible".

### The ad

- **Format:** one AdMob **anchored adaptive banner**, anchored to the bottom, on every screen.
  Its height is computed for the device width, about 50–60 dp on most phones. No interstitials,
  no rewarded ads and no pop-ups: it should never interrupt a joke.
- **Layout:** the page reserves the banner's height at the bottom (a CSS bottom inset set from
  the banner's reported size), so the banner never covers the phone "Tell me a joke" button,
  the rating buttons or the punchline. Respect the Android gesture-bar safe area.
- **Loading:** show the banner once the page has loaded. If no ad fills, collapse the space.
- **Consent:** use Google's **User Messaging Platform (UMP)** to ask for ad consent where the law
  requires it (EEA, UK, Switzerland) before ads load. Non-personalized ads if declined.
- **Test ads only** (AdMob's test ad unit ids) in development and closed testing. Never tap your
  own live ads; AdMob suspends accounts for invalid clicks.
- **app-ads.txt:** AdMob checks for an `app-ads.txt` file on the developer website listed in the
  Play store listing. That needs a domain (see "Prerequisites").

### Work

1. **Custom domain.** Register a domain, add it to CloudFront with an ACM certificate, and keep
   the CloudFront address working. It is needed for `app-ads.txt` and the privacy policy, and it
   makes the QR code permanent.
2. **Privacy policy page** on the site (`/privacy`): what is stored (jokes and ratings, no
   accounts), that the app shows Google ads, and that AdMob uses device identifiers. Required by
   Play for any app with ads.
3. **Capacitor app** in a new `packages/android` package: `@capacitor/core`, `@capacitor/android`
   and an AdMob plugin. Candidates: `@capacitor-community/admob`, or Capawesome's AdMob plugin,
   which lists anchored adaptive banners and UMP but is marked experimental. Pick after checking
   which one is maintained and supports UMP. The app points `/api` at the site's domain
   (absolute URL, CORS for the app's origin in fn-api).
4. **Banner and layout:** show the banner at the bottom, read its height, and pad the page by it.
   Hide the website's footer space when running in the app.
5. **Build and sign:** an Android App Bundle (`.aab`) with **Play App Signing**; the upload key
   kept outside the repo. A GitHub Actions job that builds the bundle.
6. **Play Console listing:** name, short and full description, icon (512 px, from Dad's photo),
   feature graphic (1024 x 500), phone screenshots, category (Entertainment), contact email,
   privacy policy URL.
7. **Play declarations:** **Contains ads: yes**; **Data safety** form (AdMob collects device and
   ad identifiers; the app stores jokes and ratings, no personal data); **content rating**
   questionnaire (IARC); **target audience 18+** (see below); advertising ID declaration.
8. **Testing track:** a new personal Play developer account must run a **closed test with at
   least 12 testers opted in for 14 days in a row** before it can publish to production. An
   organization account is exempt. Recruiting 12 colleagues is the critical path: plan two to
   three weeks before launch.
9. **Production release** after the closed test, then an AdMob account review of the app.

### Accounts and costs

- **Google Play developer account:** one-time US$25 registration fee, and identity verification.
- **AdMob account:** free. Payments need tax and payment details, and are paid out once earnings
  pass the payment threshold.
- **Domain:** about US$10–15 a year, plus Route 53 hosted zone ($0.50/month).
- **Bedrock:** every joke still calls Sonnet. Public installs could raise volume a lot; the
  `aiDailyCap` backstop (500/day today) caps it at about US$0.25/day plus library fallbacks.
  Raise it deliberately if ad revenue covers it.

### Decide before starting

- **Veeva branding.** The Vault & Pharma jokes name Veeva and Vault, which are Veeva trademarks.
  An ad-funded app on a public store is different from an internal page for colleagues: get
  approval first, or ship the store app without the Vault category (the site and the Vault page
  can keep it).
- **Audience.** Declare the app for adults (18+), not "for all ages". Apps aimed at children fall
  under Google's Families policy, which restricts ads much more strictly.
- **Developer account type.** A personal account needs the 12-tester closed test. An
  organization account skips it but needs a D-U-N-S number.
- **Ad revenue expectations.** A banner on a niche joke app with a small audience usually earns
  very little. Treat it as a learning project, not income.

### Done when

- The app is live on Google Play, installs on a recent Android phone, and tells, reveals and
  rates jokes against the production API.
- One bottom banner shows on every screen, never covers a control, and collapses when empty.
- Consent appears in the EEA/UK, and the privacy policy, Data safety form and `app-ads.txt` are
  in place.

### Sources

- [Google Play: testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Google AdMob product terms (AdSense programme policies apply)](https://transparency.google/intl/en_be/our-policies/product-terms/google-admob)
- [Capawesome Capacitor AdMob plugin (anchored adaptive banners, UMP)](https://capawesome.io/docs/sdks/capacitor/admob/)
- [AdMob GDPR consent in Capacitor](https://capgo.app/blog/admob-gdpr-consent-capacitor/)
- [Trusted Web Activities and Play policy (Chromium blog)](https://blog.chromium.org/search/label/pwa?hl=es)
