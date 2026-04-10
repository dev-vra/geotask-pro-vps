from playwright.sync_api import sync_playwright
import time

def verify_kanban_dnd():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Assumes the app is running on localhost:3000
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            
            # Login if necessary (assuming there's a login redirect)
            if "/login" in page.url:
                print("Redirected to login. Attempting login...")
                # Note: This part depends on the actual login page structure
                # For this verification, we'll just check the DOM if possible
                
            # Check for draggable cards
            cards = page.locator('[draggable="true"]')
            count = cards.count()
            print(f"Found {count} draggable cards.")
            
            if count > 0:
                print("SUCCESS: Draggable cards found.")
            else:
                print("WARNING: No draggable cards found. Maybe none are rendered yet.")
                
            # Check for drop zones
            drop_zones = page.locator('[onDrop]') # Note: Playwright might not find it this way easily
            # Better check for the specific classes we added
            columns = page.locator('.shrink-0.w-\\[272px\\]')
            col_count = columns.count()
            print(f"Found {col_count} columns.")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_kanban_dnd()
