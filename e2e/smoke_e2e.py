"""Browser smoke tests for ShikkhaHub. Run: python3 e2e/smoke_e2e.py [base_url]
Checks public pages load without crashes, protected pages redirect, and no sideways scroll on mobile."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
PUBLIC = ["/", "/courses", "/community", "/leaderboard", "/auth", "/this-page-does-not-exist"]
PROTECTED = ["/dashboard", "/profile", "/admin"]
failures = []

def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond: failures.append(msg)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for name, vp in [("desktop", {"width": 1280, "height": 1800}), ("mobile", {"width": 390, "height": 844})]:
            page = await (await b.new_context(viewport=vp)).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            for path in PUBLIC:
                errors.clear()
                await page.goto(BASE + path, wait_until="networkidle")
                body = await page.inner_text("body")
                check(len(body.strip()) > 20, f"[{name}] {path} renders content")
                check(not errors, f"[{name}] {path} no JS errors {errors[:1]}")
                overflow = await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(overflow <= 1, f"[{name}] {path} no sideways scroll ({overflow}px)")
            for path in PROTECTED:
                await page.goto(BASE + path, wait_until="networkidle")
                check("/auth" in page.url, f"[{name}] {path} redirects to sign-in")
        await b.close()
    print(f"\n{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)

asyncio.run(main())
