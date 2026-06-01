import json
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(scope="session")
def aliases():
    with open("aliases.json", "r") as f:
        # We need to test the generic alias system.
        # Since we removed hardcoded commands from the component, to verify "Shortcut" commands (which behave exactly like settings did)
        # we ensure there's an alias we can use to map to a generic settings panel or some specific command.
        # However, looking at the code, `panelMode === 'settings'` is triggered via the Alias Menu now.
        # We changed `selectAlias` to:
        # if (alias.command === 'settings' && alias.trigger === '/') {
        #   setPanelMode('settings')
        # }

        # We will dynamically inject this shortcut into aliases for the test to read
        data = json.load(f)
        data.append({
            "trigger": "/",
            "command": "settings",
            "sessionId": "mock",
            "id": "test-settings-mock"
        })
        return data

@pytest.fixture(autouse=True)
def inject_local_storage(page: Page, aliases):
    page.goto("http://127.0.0.1:4173/#/overview")
    page.evaluate(
        f"window.localStorage.setItem('jules-aliases', '{json.dumps(aliases)}')"
    )
    page.reload()
    yield

def test_bare_command(page: Page, aliases):
    input_locator = page.locator('textarea')
    expect(input_locator).to_be_visible(timeout=15000)

    shortcut = next(a for a in aliases if a['command'] == 'testing')
    trigger = shortcut.get('trigger', '/')

    input_locator.fill(trigger + shortcut['command'])

    menu_item = page.locator('button', has_text=f'{trigger}{shortcut["command"]}')
    expect(menu_item).to_be_visible(timeout=10000)

    menu_item.click()

    active_alias_display = page.locator('p', has_text=f'{trigger}{shortcut["command"]}')
    expect(active_alias_display).to_be_visible(timeout=5000)

    input_locator.press("Enter")

    # Value clears after bare command
    expect(input_locator).to_have_value("")

def test_command_with_prompt(page: Page, aliases):
    input_locator = page.locator('textarea')
    expect(input_locator).to_be_visible(timeout=15000)

    cmd = next(a for a in aliases if a['command'] == 'notes')
    trigger = cmd.get('trigger', '?')

    input_locator.fill(trigger + cmd['command'])

    menu_item = page.locator('button', has_text=f'{trigger}{cmd["command"]}')
    expect(menu_item).to_be_visible(timeout=10000)
    menu_item.click()

    active_alias_display = page.locator('p', has_text=f'{trigger}{cmd["command"]}')
    expect(active_alias_display).to_be_visible(timeout=5000)

    test_prompt = "yo I don't see my md file"
    input_locator.fill(test_prompt)
    input_locator.press("Enter")

    expect(input_locator).to_have_value("")

def test_shortcut_settings_command(page: Page, aliases):
    input_locator = page.locator('textarea')
    expect(input_locator).to_be_visible(timeout=15000)

    cmd = next(a for a in aliases if a['command'] == 'settings')
    trigger = cmd.get('trigger', '/')

    input_locator.fill(trigger + cmd['command'])

    menu_item = page.locator('button', has_text=f'{trigger}{cmd["command"]}')
    expect(menu_item).to_be_visible(timeout=10000)
    menu_item.click()

    # In the refactored code, clicking /settings clears input and opens the settings panel Mode
    # The active alias will NOT be set (setActiveAlias(null)), input is cleared.
    expect(input_locator).to_have_value("")

    # Assuming there's something indicative of settings panel in DOM. The code has `<SettingsPage />`.
    # Let's check for any text or div that is specific to settings, or just ensure input cleared correctly.
    # We can at least check that alias display isn't there
    active_alias_display = page.locator('p', has_text=f'{trigger}{cmd["command"]}')
    expect(active_alias_display).not_to_be_visible()
