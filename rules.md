# 🌊 MVP DEVELOPMENT GUIDE

## 📦 Tech Stack
- **Framework**: Next.js (App Router, Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Auth/DB**: Supabase
- **UI Toolkit**: Shadcn (Radix UI-based)
- **Boilerplate Helper**: WindSurf

---

## 🧠 Code Philosophy

### DRY — Don’t Repeat Yourself
- Reuse logic through **hooks**, **utils**, and **components**
- Avoid copy-pasting; extract shared behavior
- Abstract logic into reusable modules, not just for now, but for the future

### KISS — Keep It Simple, Stupid
- Solve today’s problem, not tomorrow’s
- Don’t over-engineer or over-abstract

### SOC — Separation of Concerns
- Keep files and logic single-purpose
- UI, logic, and services should be modular and isolated

---


## 🖼️ UI & Design Language

- **Style**: Modern, minimal, clean
- **Layout**: Grid-based, responsive (mobile-first)
- **Colors**: Support both Light & Dark mode
- **Spacing**: Consistent spacing (`p-x`, `m-x`, `gap-x`)
- **Typography**: Scalable font sizes (`text-base`, `text-lg`, `text-2xl`)
- **Accessibility**: Semantic HTML, ARIA where needed
- **Animations**: Subtle, using `framer-motion` or CSS transitions
- **Components**: Built with `shadcn/ui` for consistency

---

## 💡 Coding Standards

### ✅ TypeScript
- Prefer interfaces for object shapes
- Avoid `any`, use type narrowing
- Declare types for all props and state

### ✅ Next.js
- Use App Router (v13+)
- Use `page.tsx`, `layout.tsx`, `loading.tsx`, and `error.tsx` conventions
- Use `server-only` and `client-only` strategically

### ✅ Tailwind CSS
- Keep classNames short and readable
- Use `@apply` in `.css` for long or repeated styles
- Create utility classes only when reused a lot

### ✅ Shadcn
- Don’t modify the core components directly
- Extend components via wrappers or custom props
- Follow accessibility best practices built-in by Radix

---

## 📱 Responsive Design

- **Mobile-first**: Build for mobile, enhance for desktop
- Use `sm: md: lg: xl:` breakpoints consistently
- Use responsive units: `w-full`, `h-auto`, `max-w-screen-md`
- Test on various screen sizes early

---

## 🌗 Dark Mode / Light Mode

- Use Tailwind's `dark:` variant
- Store theme in context or local storage
- Use system preference as fallback

```tsx
<div className="bg-white text-black dark:bg-black dark:text-white" />

