from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    responses = []
    def handle_response(res):
        if "login" in res.url:
            print(f"Login API Response: {res.url} | Status: {res.status}")
            try:
                print(f"Body: {res.text()}")
            except:
                pass

    page.on("response", handle_response)
    
    print("Navigating to login page...")
    page.goto("https://geotask-pro.vercel.app/login")
    page.wait_for_load_state("networkidle")
    
    print("Filling credentials...")
    page.fill("input[type='email']", "admin@admin.com")
    page.fill("input[type='password']", "wrong_pass")
    
    print("Clicking submit...")
    page.click("button[type='submit']")
    
    page.wait_for_timeout(5000)
    page.screenshot(path="login_debug.png")
    print("Saved screenshot to login_debug.png")
    
    browser.close()
