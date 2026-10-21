#!/usr/bin/env python3
"""
End-to-End-Test von CillsGames im echten Browser (Playwright + Chromium).
Spielt alle 20 Spiele an und klickt sich durch Shop, Casino, Tauschen, Admin, Leiter usw.
Bricht bei JEDEM JavaScript-Fehler ab.

Benutzung:
  pip install playwright && playwright install chromium
  python3 tests/e2e/run.py              # Screenshots landen in tests/e2e/screenshots/
Optionen (Umgebungsvariablen):
  CHROME=/pfad/zu/chrome  SHOTS=/ordner  HEADED=1
"""
import os, re, subprocess, sys, time, random, socket, traceback

def _gh_error(msg):
    # In GitHub Actions als sichtbare Fehlermeldung (Annotation) ausgeben
    if os.environ.get('GITHUB_ACTIONS'):
        print('::error title=Browser-Test::' + msg.replace('%', '%25').replace('\r', '').replace('\n', '%0A')[:4000], flush=True)

def _hook(t, v, tb):
    _gh_error(''.join(traceback.format_exception(t, v, tb))[-3500:] + '\nLetzter Schritt: ' + str(globals().get('LAST_STEP')))
    sys.__excepthook__(t, v, tb)
sys.excepthook = _hook
LAST_STEP = None
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
SHOTS = Path(os.environ.get('SHOTS', ROOT / 'tests' / 'e2e' / 'screenshots'))
SHOTS.mkdir(parents=True, exist_ok=True)
# Der Test benutzt ein eigenes Test-Passwort: admin-auth.js wird im Test-Browser mit dessen
# Fingerabdruck ausgeliefert. Das echte Admin-Passwort steht nirgends im Repo.
import hashlib
ADMIN_PW = 'e2e-test-admin'
TEST_HASH = hashlib.pbkdf2_hmac('sha256', ADMIN_PW.encode(), b'cillsgames-admin-v1', 200000, 32).hex()

def use_test_admin_password(ctx):
    src = (ROOT / 'js' / 'admin-auth.js').read_text(encoding='utf-8')
    patched = re.sub(r"ADMIN_PASSWORD_HASH = '[0-9a-f]{64}'", f"ADMIN_PASSWORD_HASH = '{TEST_HASH}'", src)
    assert patched != src
    ctx.route('**/js/admin-auth.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=patched))
random.seed(7)

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

PORT = free_port()
BASE = f'http://127.0.0.1:{PORT}/'
server = subprocess.Popen(['node', str(ROOT / 'scripts' / 'serve.mjs')], env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
time.sleep(0.8)

errors = []
step_count = 0

def step(msg):
    global step_count, LAST_STEP
    step_count += 1
    LAST_STEP = msg
    print(f'  ✓ {msg}', flush=True)

def watch(page, allow=()):
    def on_console(m):
        if m.type == 'error' and not any(a in m.text for a in allow):
            errors.append(f'[console] {m.text}')
    page.on('console', on_console)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))

def check_errors(where):
    if errors:
        _gh_error(f'JavaScript-Fehler bei {where}:\n' + '\n'.join(errors))
        print(f'\n✗ JavaScript-Fehler bei: {where}')
        for e in errors: print('   ', e)
        raise SystemExit(1)

def close_toasts(page):
    page.evaluate("document.querySelectorAll('.toast').forEach(t=>t.remove())")

def dialog(page):
    return page.locator('.dialog-backdrop.show .dialog').last

def register(page, name, pw='geheim123'):
    page.click('#loginBtn') if page.locator('#loginBtn').is_visible() else page.click('[data-act=login]')
    d = dialog(page)
    d.locator('[data-tab=register]').click()
    f = d.locator('[data-form=register]')
    f.locator('[name=name]').fill(name)
    f.locator('[name=pass]').fill(pw)
    f.locator('[name=pass2]').fill(pw)
    f.locator('button[type=submit]').click()
    expect(page.locator('#loginBtn')).to_have_text(f'👤 {name}', timeout=5000)

def login(page, name, pw='geheim123'):
    page.goto(BASE + '?backend=local#/einstellungen')
    page.wait_for_selector('.settings')
    page.locator('[data-act=login]').click()
    d = dialog(page)
    d.locator('[data-form=login] [name=name]').fill(name)
    d.locator('[data-form=login] [name=pass]').fill(pw)
    d.locator('[data-form=login] button[type=submit]').click()
    try:
        expect(page.locator('#menuUser')).to_have_text(name, timeout=10000)
    except AssertionError:
        msg = d.locator('[data-form=login] .form-error').inner_text() if d.count() else '(kein Login-Fenster mehr offen)'
        raise AssertionError(f'Login als {name} fehlgeschlagen – Meldung im Fenster: {msg!r}')

def logout(page):
    page.goto(BASE + '?backend=local#/einstellungen')
    page.locator('[data-act=logout]').click()
    dialog(page).locator('[data-act=yes]').click()
    expect(page.locator('#menuUser')).to_have_text('Nicht eingeloggt', timeout=5000)

def header_points(page):
    return page.locator('#hdrPoints').inner_text()

# ── Eingaben für jedes Spiel ───────────────────────────────────────
def play_canvas(page, keys, secs=3.0, clicks=False):
    c = page.locator('.game-canvas')
    c.wait_for()
    box = c.bounding_box()
    end = time.time() + secs
    while time.time() < end:
        k = random.choice(keys)
        page.keyboard.down(k); page.wait_for_timeout(random.randint(30, 160)); page.keyboard.up(k)
        if clicks and box:
            page.mouse.click(box['x'] + random.random() * box['width'], box['y'] + random.random() * box['height'])
        page.wait_for_timeout(40)

def choose_mode(page, which=0):
    # Warten, bis die Schwierigkeitsauswahl wirklich da ist (alle Spiele haben eine)
    btns = page.locator('.mode-picker .mode-btn')
    btns.first.wait_for(timeout=10000)
    btns.nth(min(which, btns.count() - 1)).click()
    page.locator('.mode-picker').wait_for(state='detached', timeout=5000)
    page.wait_for_timeout(200)

def play_game(page, gid):
    if gid in ('dino', 'flappy'):
        play_canvas(page, ['Space', 'ArrowUp', 'ArrowDown'], clicks=True)
    elif gid in ('rocket', 'snake', 'pacman', 'asteroids', 'tetris'):
        play_canvas(page, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyC', 'KeyP', 'KeyP'], secs=3.5)
    elif gid in ('pong', 'breakout', 'carracing'):
        play_canvas(page, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'], clicks=True)
    elif gid in ('blockblast', 'bubbleshooter', 'towerdefense'):
        play_canvas(page, ['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'ArrowLeft'], secs=3.5, clicks=True)
    elif gid == 'wordle':
        page.keyboard.type('XX'); page.keyboard.press('Enter'); page.wait_for_timeout(150)
        page.locator('.wl-key[data-k="⌫"]').click(); page.locator('.wl-key[data-k="⌫"]').click()
        for word in ['APFEL', 'NEBEL', 'STERN', 'KATZE', 'BLUME', 'HAFEN']:
            if page.locator('.wl-result').count(): break
            page.keyboard.type(word); page.keyboard.press('Enter'); page.wait_for_timeout(250)
        page.locator('.wl-result').wait_for(timeout=4000)
        assert page.locator('.wl-stats').count() == 1
        page.locator('.wl-result [data-next]').click()
    elif gid == 'tictactoe':
        for _ in range(14):
            cells = page.locator('.ttt-cell:not([disabled])')
            if cells.count() == 0: break
            cells.nth(random.randrange(cells.count())).click(); page.wait_for_timeout(700)
    elif gid == 'connect4':
        for _ in range(6):
            cols = page.locator('.c4-col:not([disabled])')
            if cols.count() == 0: break
            cols.nth(random.randrange(cols.count())).click(); page.wait_for_timeout(600)
    elif gid == 'memory':
        for i in range(10):
            cards = page.locator('.mem-card:not(.matched):not(.flipped)')
            if cards.count() < 2: break
            cards.nth(0).click(); cards.nth(1).click(); page.wait_for_timeout(850)
    elif gid == 'minesweeper':
        cells = page.locator('.ms-cell')
        cells.nth(66).click()
        cells.nth(0).click(button='right')
        page.locator('.ms-mode').click(); cells.nth(1).click(); page.locator('.ms-mode').click()
        for i in random.sample(range(144), 6):
            if page.locator('.dialog-backdrop.show').count(): break
            cells.nth(i).click(); page.wait_for_timeout(80)
    elif gid == 'typing':
        for _ in range(3):
            w = page.locator('.typ-word').inner_text().replace('\n', '')
            page.locator('.typ-input').type(w, delay=15); page.wait_for_timeout(120)
        page.locator('.typ-input').type('qq')
    elif gid == 'quiz':
        page.locator('[data-joker=half]').click(); assert page.locator('.quiz-a.gone').count() == 2
        page.locator('[data-joker=time]').click()
        for _ in range(3):
            page.locator('.quiz-a').first.wait_for()
            page.locator('.quiz-a:not(.gone)').first.click(); page.wait_for_timeout(1750)
        page.keyboard.press('Digit2'); page.wait_for_timeout(300)

def finish_round(page, gid, retry=False):
    other = page.locator('.dialog-backdrop.show .dialog:not(:has(.game-over))')
    if other.count():
        raise AssertionError(f'{gid}: unerwartetes Fenster offen: ' + other.first.inner_text()[:300])
    # Per JavaScript klicken: endet das Spiel genau jetzt von selbst, liegt sonst das
    # "Spiel vorbei"-Fenster über dem Knopf. Ist die Runde schon vorbei, macht der Klick nichts.
    page.evaluate("document.querySelector('[data-act=finish]').click()")
    go = page.locator('.game-over')
    go.wait_for(timeout=6000)
    pts = go.locator('.go-points').inner_text()
    if retry:
        go.locator('[data-go=retry]').click()
        page.wait_for_timeout(500)
        assert page.locator('.game-over').count() == 0, 'Dialog nach Nochmal noch offen'
        page.locator('[data-act=finish]').click()
        page.locator('.game-over').wait_for(timeout=6000)
    page.locator('[data-go=menu]').click()
    page.wait_for_selector('[data-grid]')
    return pts

FREE = ['dino', 'rocket', 'snake', 'flappy', 'pong', 'blockblast', 'breakout', 'asteroids', 'carracing', 'bubbleshooter', 'wordle']
LOCKED = ['tictactoe', 'typing', 'memory', 'connect4', 'minesweeper', 'towerdefense', 'tetris', 'quiz', 'pacman']

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, headless=not os.environ.get('HEADED'))
    ctx = browser.new_context(viewport={'width': 1280, 'height': 860}, locale='de-CH')
    use_test_admin_password(ctx)
    page = ctx.new_page()
    watch(page)
    print('▶ Start & Navigation')
    page.goto(BASE + '?backend=local')
    page.wait_for_selector('[data-grid] .game-card')
    assert page.locator('.game-card').count() == 20
    assert page.title() == 'Spiele · CillsGames'
    step('20 Spielkarten, Tab-Titel stimmt')
    page.fill('.search', 'pac-man'); assert page.locator('.game-card').count() == 1
    page.fill('.search', ''); page.click('[data-cat=duel]'); assert page.locator('.game-card').count() == 3
    page.click('[data-cat=all]')
    step('Suche und Filter')
    page.locator('.game-card[data-id=snake] [data-act=help]').click()
    expect(dialog(page)).to_contain_text('Snake'); page.keyboard.press('Escape')
    step('Anleitung öffnen/schliessen (Esc)')
    for route, sel in [('#/rangliste', '.page-title'), ('#/shop', '.shop-grid'), ('#/casino', '.casino-grid'), ('#/tauschen', '[data-form]'), ('#/info', '[data-rate]'), ('#/einstellungen', '.settings'), ('#/profil', '.page-title'), ('#/admin', '.page-title'), ('#/leiter', '.page-title'), ('#/gibtsnicht', '[data-grid]')]:
        page.goto(BASE + '?backend=local' + route); page.wait_for_selector(sel)
    page.go_back(); page.wait_for_selector('.page-title')
    step('Alle Seiten erreichbar, Zurück-Knopf, unbekannte Route -> Start')
    page.goto(BASE + '?backend=local#/'); page.locator('#menuBtn').click()
    expect(page.locator('#sideMenu')).to_have_class(re.compile('open'))
    page.keyboard.press('Escape'); expect(page.locator('#sideMenu')).not_to_have_class(re.compile('open'))
    step('Seitenmenü auf/zu')
    check_errors('Navigation')

    print('▶ Gast spielt')
    page.goto(BASE + '?backend=local#/spiel/snake')
    page.wait_for_selector('.guest-note')
    choose_mode(page)
    play_canvas(page, ['ArrowUp', 'ArrowLeft'], secs=1)
    finish_round(page, 'snake')
    assert header_points(page) == '0'
    page.goto(BASE + '?backend=local#/spiel/pacman'); page.wait_for_selector('[data-grid]')
    step('Gast kann spielen (ohne Speichern), gesperrte Spiele umgeleitet')

    print('▶ Registrierung & Login')
    page.goto(BASE + '?backend=local#/')
    page.click('#loginBtn')
    d = dialog(page); d.locator('[data-tab=register]').click()
    f = d.locator('[data-form=register]')
    f.locator('[name=name]').fill('x'); f.locator('[name=pass]').fill('123'); f.locator('[name=pass2]').fill('123'); f.locator('button[type=submit]').click()
    expect(f.locator('.form-error')).not_to_be_empty()
    f.locator('[name=name]').fill('<b>Hack</b>'); f.locator('[name=pass]').fill('geheim123'); f.locator('[name=pass2]').fill('geheim123'); f.locator('button[type=submit]').click()
    expect(f.locator('.form-error')).to_contain_text('Erlaubt')
    page.keyboard.press('Escape')
    step('Ungültige Eingaben werden abgefangen')
    register(page, 'Tester')
    step('Registrierung "Tester"')
    close_toasts(page)
    page.locator('[data-act=daily]').click()
    expect(page.locator('#hdrPoints')).to_have_text('25')
    expect(page.locator('.banner-muted')).to_be_visible()
    step('Tagesbonus +25 (nur einmal)')

    print('▶ Freie Spiele')
    for i, gid in enumerate(FREE):
        page.goto(BASE + f'?backend=local#/spiel/{gid}')
        choose_mode(page, i % 3)
        page.wait_for_timeout(300)
        play_game(page, gid)
        page.screenshot(path=str(SHOTS / f'game-{gid}.png'))
        pts = finish_round(page, gid, retry=(i % 4 == 0))
        check_errors(gid)
        step(f'{gid}: {pts}')
    page.goto(BASE + '?backend=local#/profil'); page.wait_for_selector('.hs-list')
    played = int(page.locator('.profile-stats div').nth(2).locator('b').inner_text().replace("'", ''))
    assert played >= len(FREE), played
    step(f'Profil zählt {played} Spiele')

    print('▶ Besitzer wird Admin')
    logout(page)
    register(page, 'CillX11')
    expect(page.locator('#adminItem')).to_be_hidden(timeout=1) if False else None
    page.goto(BASE + '?backend=local#/admin')
    page.fill('[data-pw] input', 'falsch'); page.click('[data-pw] button')
    expect(page.locator('[data-pw] .form-error')).to_contain_text('Falsches')
    page.fill('[data-pw] input', ADMIN_PW); page.click('[data-pw] button')
    page.wait_for_selector('.admin-row')
    step('Admin: falsches Passwort abgelehnt, richtiges akzeptiert, Rolle aktiviert')
    row = page.locator('.admin-row', has_text='CillX11')
    row.locator('[data-f=points]').fill('20000'); row.locator('[data-f=stars]').fill('3')
    row.locator('[data-a=save]').click()
    expect(page.locator('#hdrPoints')).to_have_text('20k')
    step('Admin setzt Punkte -> Kopfzeile aktualisiert sich sofort')
    trow = page.locator('.admin-row', has_text='Tester')
    trow.locator('[data-a=role]').click(); dialog(page).locator('[data-v=leiter]').click()
    expect(page.locator('.admin-row', has_text='Tester')).to_contain_text('Leiter')
    trow.locator('[data-a=items]').click()
    dialog(page).locator('input[value=badge_crown]').check(); dialog(page).locator('[data-save]').click()
    page.wait_for_timeout(300)
    page.click('[data-tab=vouchers]')
    page.fill('[data-new] [name=code]', 'cills test 1'); page.select_option('[data-new] [name=item]', 'frame_hacker'); page.click('[data-new] button[type=submit]')
    page.wait_for_selector('code:has-text("CILLSTEST1")')
    page.click('[data-tab=log]'); page.wait_for_selector('.log-row')
    page.screenshot(path=str(SHOTS / 'admin.png'), full_page=True)
    step('Rolle vergeben, Items geben, Gutschein erstellen, Protokoll')
    check_errors('Admin')

    print('▶ Gesperrte Spiele')
    page.goto(BASE + '?backend=local#/')
    assert page.locator('.game-card.locked').count() == 0, 'Alles sollte frei sein'
    for i, gid in enumerate(LOCKED):
        page.goto(BASE + f'?backend=local#/spiel/{gid}')
        choose_mode(page, i % 3)
        page.wait_for_timeout(300)
        play_game(page, gid)
        page.screenshot(path=str(SHOTS / f'game-{gid}.png'))
        pts = finish_round(page, gid, retry=(i % 3 == 0))
        check_errors(gid)
        step(f'{gid}: {pts}')

    print('▶ Shop, Tauschen, Casino')
    page.goto(BASE + '?backend=local#/shop')
    for rid in ['title_admin', 'badge_admin', 'title_leiter']:
        assert page.locator(f'[data-buy={rid}]').count() == 0, f'{rid} darf nicht kaufbar sein'
    page.locator('[data-buy=badge_fire]').click(); dialog(page).locator('[data-act=yes]').click()
    page.locator('[data-equip=badge_fire]').wait_for()
    page.locator('[data-equip=badge_fire]').click()
    expect(page.locator('[data-equip=badge_fire]')).to_contain_text('Ausgerüstet')
    page.click('[data-slot=frame]'); assert page.locator('.shop-item').count() > 5
    page.locator('[data-buy=frame_gold]').click(); dialog(page).locator('[data-act=yes]').click()
    page.locator('[data-equip=frame_gold]').click()
    step('Kaufen & Ausrüsten')
    page.goto(BASE + '?backend=local#/tauschen')
    before = page.locator('[data-stars]').inner_text()
    page.click('[data-q="1000"]'); page.click('[data-form] button[type=submit]'); dialog(page).locator('[data-act=yes]').click()
    expect(page.locator('[data-stars]')).not_to_have_text(before)
    step('Punkte -> Sterne')
    page.goto(BASE + '?backend=local#/casino')
    for g in ['slots', 'roulette', 'coin', 'dice']:
        page.click(f'[data-game={g}]')
        d = dialog(page)
        d.locator('[data-bet="500"]').click()
        d.locator('[data-play]').first.click()
        expect(d.locator('[data-result]')).not_to_be_empty(timeout=4000)
        page.screenshot(path=str(SHOTS / f'casino-{g}.png'))
        page.keyboard.press('Escape'); page.wait_for_timeout(250)
    step('Alle 4 Casino-Spiele')
    page.goto(BASE + '?backend=local#/info')
    page.locator('.rate-star').nth(4).click(); page.fill('[data-rate] textarea', 'Mega gut <script>alert(1)</script>')
    page.click('[data-rate] button[type=submit]'); page.wait_for_selector('.toast-success')
    page.goto(BASE + '?backend=local#/admin'); page.click('[data-tab=feedback]')
    page.wait_for_selector('.feedback')
    assert '<script>' in page.locator('.feedback p').first.inner_text(), 'Feedback muss als Text erscheinen'
    step('Bewertung absenden, im Admin sichtbar (XSS-sicher)')
    check_errors('Shop/Casino')

    print('▶ Leiter & Gutschein')
    logout(page)
    login(page, 'Tester')
    page.goto(BASE + '?backend=local#/shop')
    page.fill('[data-voucher] input', 'cillstest1'); page.click('[data-voucher] button')
    page.wait_for_selector('.toast-success')
    page.fill('[data-voucher] input', 'CILLSTEST1'); page.click('[data-voucher] button')
    page.wait_for_selector('.toast-error')
    page.goto(BASE + '?backend=local#/profil')
    page.locator('[data-equip=badge_crown]').click(); page.locator('[data-equip=frame_hacker]').click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / 'profile.png'), full_page=True)
    step('Gutschein einlösen (nur einmal), exklusive Items ausrüsten')
    page.goto(BASE + '?backend=local#/admin'); page.wait_for_selector('.page-title')
    assert page.locator('.admin-row').count() == 0
    page.goto(BASE + '?backend=local#/leiter'); page.wait_for_selector('.admin-row')
    assert page.locator('[data-a=del]').count() == 0 and page.locator('[data-a=items]').count() == 0
    r = page.locator('.admin-row', has_text='CillX11')
    r.locator('[data-f=stars]').fill('42'); r.locator('[data-a=save]').click(); page.wait_for_selector('.toast-success')
    step('Leiter: kein Admin-Zugang, darf nur Punkte/Sterne/Spiele')
    page.goto(BASE + '?backend=local#/rangliste'); page.wait_for_selector('.lb-table tbody tr')
    assert page.locator('.lb-table tbody tr').count() == 2
    assert page.locator('.lb-table tbody tr').first.inner_text().find('CillX11') >= 0
    expect(page.locator('.lb-table tbody tr', has_text='CillX11')).to_contain_text('Admin')
    expect(page.locator('.lb-table tbody tr', has_text='Tester')).to_contain_text('Leiter')
    page.screenshot(path=str(SHOTS / 'leaderboard.png'))
    page.locator('.lb-table tbody tr').first.click(); page.wait_for_selector('.profile-card')
    step('Rangliste sortiert, Admin-/Leiter-Titel automatisch, Profil anderer Spieler')
    page.goto(BASE + '?backend=local#/einstellungen')
    page.locator('[data-set=sound]').uncheck(); page.locator('[data-set=reduceMotion]').check()
    page.reload(); page.wait_for_selector('.settings')
    assert not page.locator('[data-set=sound]').is_checked()
    page.locator('[data-set=reduceMotion]').uncheck(); page.locator('[data-set=sound]').check()
    step('Einstellungen bleiben gespeichert')
    check_errors('Leiter/Rangliste')

    print('▶ Handy-Ansicht')
    m = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    mp = m.new_page(); watch(mp)
    mp.goto(BASE + '?backend=local'); mp.wait_for_selector('.game-card')
    w = mp.evaluate('document.documentElement.scrollWidth')
    assert w <= 390, f'Seite breiter als Handy: {w}px'
    mp.screenshot(path=str(SHOTS / 'mobile-home.png'))
    mp.goto(BASE + '?backend=local#/spiel/snake'); mp.wait_for_selector('.mode-btn'); mp.locator('.mode-btn').first.tap(); mp.wait_for_selector('.touch-controls')
    mp.locator('.touch-btn').nth(1).tap(); mp.wait_for_timeout(200)
    mp.locator('.touch-btn').nth(1).tap(); mp.wait_for_timeout(400)
    mp.screenshot(path=str(SHOTS / 'mobile-snake.png'))
    mp.goto(BASE + '?backend=local#/spiel/wordle'); mp.wait_for_selector('.mode-btn'); mp.locator('.mode-btn').nth(1).tap(); mp.wait_for_selector('.wl-key')
    mp.screenshot(path=str(SHOTS / 'mobile-wordle.png'))
    assert mp.evaluate('document.documentElement.scrollWidth') <= 390
    step('Keine horizontale Scrollleiste, Touch-Tasten vorhanden')
    check_errors('Handy')

    print('▶ Start mit Firebase-Backend (ohne Netz)')
    fctx = browser.new_context()
    fp = fctx.new_page()
    watch(fp, allow=('firestore', 'Firestore', 'net::', 'Failed to load resource', 'googleapis', 'Could not reach', 'identitytoolkit'))
    fp.goto(BASE); fp.wait_for_selector('.game-card', timeout=20000)
    backend = fp.evaluate('document.documentElement.dataset.backend')
    step(f'Seite startet (Backend: {backend})')
    check_errors('Firebase-Start')

    browser.close()
server.terminate()
print(f'\n✅ Alle {step_count} Schritte bestanden – keine JavaScript-Fehler. Screenshots: {SHOTS}')
