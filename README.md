# Tecmo Super Bowl ROM Editor

A browser-based tool for editing player names in a Tecmo Super Bowl (NES) ROM. Runs entirely in your browser — no data is uploaded anywhere.

> **You must supply your own legally-owned ROM.** This tool ships with no game data.

---

## How to change player names

### 1. Open the editor and upload your ROM

Drag your `.nes` file onto the upload area at the top of the page.

### 2. Go to the Names tab

Click the **Names** tab in the navigation bar.

### 3. Load rosters

Click **Load rosters**. The editor reads the 28-team pointer table directly from your ROM and displays every team and player.

### 4. Find the player

Teams are listed by name. Each row shows the player's **jersey number**, **first name**, and **last name**.

### 5. Edit the name

Click into the **First Name** or **Last Name** field and type the new value. The field turns yellow to indicate a change.

> **Note:** Each field has a fixed maximum length based on how many bytes the original ROM allocates for that player's name. You cannot make a name longer than the original — only shorter (or the same length).

### 6. Export the modified ROM

Click **Export ROM** at the top of the Names tab to download the patched `.nes` file. You can also export an **IPS patch** if you want to distribute just the changes.

---

## Name format

Tecmo Super Bowl stores names as `lowercasefirstname` + `UPPERCASELASTNAME` with no space — the game engine inserts the space at render time. The editor handles this automatically:

- First name fields accept any case; the editor writes them lowercase.
- Last name fields accept any case; the editor writes them uppercase.

Special cases the game supports (and the editor preserves):
- **Initials** — `c.BENNETT` renders as `C.BENNETT`
- **Multi-word first names** — `ivy joeHUNTER` renders as `IVY JOE HUNTER`
- **Position labels** — `qbEAGLES` renders as `QB EAGLES`

---

## Other tabs

| Tab | Purpose |
|-----|---------|
| **Research** | Search for strings in the ROM, view hex data, compare original vs. modified bytes |
| **Mappers** | Define custom player/team record layouts for the Players and Teams tabs |
| **Players** | Edit all player fields (speed, ratings, etc.) using a configured record map |
| **Teams** | Edit team fields using a configured record map |
| **Export** | Export the modified ROM, an IPS patch, or the record map config as JSON |

---

## Running locally

```bash
npm install
npm run dev
```

Requires Node.js 18+.
