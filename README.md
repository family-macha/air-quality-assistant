# Smog Day Planner — Urban Air Quality Assistant (Challenge 6)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-air--quality--assistant--six.vercel.app-00bb77?style=flat-square&logo=vercel)](https://air-quality-assistant-six.vercel.app/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffamily-macha%2Fair-quality-assistant&env=GEMINI_API_KEY,GEMINI_MODEL&envDescription=Optionally%20set%20your%20Gemini%20API%20key%20for%20AI-generated%20summaries)

🔗 **Live Deployment:** [https://air-quality-assistant-six.vercel.app/](https://air-quality-assistant-six.vercel.app/)

**Vertical:** Urban Air Quality Assistant for families and communities facing severe winter smog.

---

### Demo Preview
![Smog Day Planner Demo](./air-quality-assistant-demo.gif)

> 📹 High-definition MP4 video available: [air-quality-assistant-demo.mp4](./air-quality-assistant-demo.mp4)

---

## Approach and logic
1. **Live data**: the city is geocoded and current US AQI and PM2.5 are read from Open-Meteo (no API key).
2. **Context-aware rule engine** (`lib/advice.js`): household profile (children, elders, lung conditions, purifier, cooking fuel, commute) shifts the effective risk one band worse for vulnerable people, then selects ranked actions: low-emission routines, indoor air hacks and sustainable alternatives.
3. **Explained impact**: every action carries *why it works* and an approximate *impact* (health exposure or CO₂).
4. **GenAI layer** (`lib/gemini.js`): Gemini writes a short plain-language summary from validated facts only. If no key is set or the call fails, the deterministic plan still works.

## Design decisions
- **Code quality**: small pure modules, JSDoc, no dependencies (nothing to patch, tiny repo).
- **Security**: allow-list validation, no HTML injection (`textContent` only), strict CSP and security headers (`vercel.json`), API key server-side only, prompt treats user data as data, rate limiting, generic error messages.
- **Efficiency**: 10-minute upstream cache, request timeouts, zero client dependencies, one small API call path.
- **Testing**: `npm test` (Node built-in runner, all network calls injected and mocked) plus GitHub Actions CI.
- **Accessibility**: semantic landmarks, labelled controls, 44px targets, visible focus, skip link, live region, colour never the only signal, dark mode, reduced motion and forced-colors support.

## Run and deploy
```
npm test
npx vercel dev        # local
npx vercel --prod     # deploy; optionally set GEMINI_API_KEY in Vercel project settings
```

## Assumptions
- US AQI is used worldwide for consistency. Impact figures are approximate, from public health literature, and not medical advice.
- Rate limiting is best effort per serverless instance. The first matching city from the geocoder is used.

## Contributors
- **family-macha** ([@family-macha](https://github.com/family-macha)) - `familyspace829@gmail.com`

